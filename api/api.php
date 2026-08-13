<?php
ini_set('upload_max_filesize', '500M');
ini_set('post_max_size', '500M');
ini_set('memory_limit', '1024M');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

$storageDir = __DIR__ . '/../storage/';
$dataFile = $storageDir . 'data.json';

if (!file_exists($storageDir)) {
    mkdir($storageDir, 0777, true);
}
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}

function deleteDirectory($dir) {
    if (!file_exists($dir)) return true;
    if (!is_dir($dir)) return unlink($dir);
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') continue;
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
    }
    return rmdir($dir);
}

$action = $_GET['action'] ?? '';

if ($action === 'get_all') {
    $data = json_decode(file_get_contents($dataFile), true);
    echo json_encode($data);
    exit;
}

if ($action === 'create_series') {
    $title = $_POST['title'] ?? '';
    $type = $_POST['type'] ?? 'Manga';

    if (empty($title)) {
        echo json_encode(['status' => 'error', 'message' => 'Judul tidak boleh kosong']);
        exit;
    }

    $folderName = preg_replace('/[^A-Za-z0-9_\- ]/', '', $title);
    $seriesPath = $storageDir . $folderName . '/';

    if (!file_exists($seriesPath)) {
        mkdir($seriesPath, 0777, true);
    }

    $coverPath = null;
    if (isset($_FILES['cover']) && $_FILES['cover']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION);
        $coverName = 'cover.' . strtolower($ext);
        move_uploaded_file($_FILES['cover']['tmp_name'], $seriesPath . $coverName);
        $coverPath = 'storage/' . rawurlencode($folderName) . '/' . $coverName;
    }

    $chapters = [];
    if (isset($_FILES['chapters'])) {
        $uploadedFiles = $_FILES['chapters'];
        if (is_array($uploadedFiles['name'])) {
            $count = count($uploadedFiles['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($uploadedFiles['error'][$i] === UPLOAD_ERR_OK) {
                    $fileName = $uploadedFiles['name'][$i];
                    $destination = $seriesPath . $fileName;

                    if (move_uploaded_file($uploadedFiles['tmp_name'][$i], $destination)) {
                        $chapters[] = [
                            'id' => uniqid(),
                            'name' => $fileName,
                            'fileUrl' => 'storage/' . rawurlencode($folderName) . '/' . $fileName
                        ];
                    }
                }
            }
        } else {
            if ($uploadedFiles['error'] === UPLOAD_ERR_OK) {
                $fileName = $uploadedFiles['name'];
                $destination = $seriesPath . $fileName;

                if (move_uploaded_file($uploadedFiles['tmp_name'], $destination)) {
                    $chapters[] = [
                        'id' => uniqid(),
                        'name' => $fileName,
                        'fileUrl' => 'storage/' . rawurlencode($folderName) . '/' . $fileName
                    ];
                }
            }
        }
    }

    $data = json_decode(file_get_contents($dataFile), true);
    $newSeries = [
        'id' => uniqid(),
        'title' => $title,
        'type' => $type,
        'folderName' => $folderName,
        'coverUrl' => $coverPath,
        'chapters' => $chapters
    ];

    $data[] = $newSeries;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode(['status' => 'success', 'data' => $newSeries]);
    exit;
}

if ($action === 'edit_series') {
    $seriesId = $_POST['series_id'] ?? '';
    $newTitle = $_POST['title'] ?? '';
    $newType = $_POST['type'] ?? '';

    $data = json_decode(file_get_contents($dataFile), true);
    foreach ($data as &$s) {
        if ($s['id'] === $seriesId) {
            if (!empty($newTitle)) $s['title'] = $newTitle;
            if (!empty($newType)) $s['type'] = $newType;

            if (isset($_FILES['cover']) && $_FILES['cover']['error'] === UPLOAD_ERR_OK) {
                $seriesPath = $storageDir . $s['folderName'] . '/';
                $ext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION);
                $coverName = 'cover.' . strtolower($ext);
                move_uploaded_file($_FILES['cover']['tmp_name'], $seriesPath . $coverName);
                $s['coverUrl'] = 'storage/' . rawurlencode($s['folderName']) . '/' . $coverName;
            }

            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
            echo json_encode(['status' => 'success', 'data' => $s]);
            exit;
        }
    }
    echo json_encode(['status' => 'error', 'message' => 'Series tidak ditemukan']);
    exit;
}

if ($action === 'delete_series') {
    $seriesId = $_POST['series_id'] ?? '';
    $data = json_decode(file_get_contents($dataFile), true);

    $newData = [];
    foreach ($data as $s) {
        if ($s['id'] === $seriesId) {
            $seriesPath = $storageDir . $s['folderName'];
            deleteDirectory($seriesPath);
        } else {
            $newData[] = $s;
        }
    }

    file_put_contents($dataFile, json_encode($newData, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'upload_chapter') {
    $seriesId = $_POST['series_id'] ?? '';
    $data = json_decode(file_get_contents($dataFile), true);
    $seriesIndex = -1;

    foreach ($data as $index => $s) {
        if ($s['id'] === $seriesId) {
            $seriesIndex = $index;
            break;
        }
    }

    if ($seriesIndex === -1) {
        echo json_encode(['status' => 'error', 'message' => 'Series tidak ditemukan']);
        exit;
    }

    $folderName = $data[$seriesIndex]['folderName'];
    $seriesPath = $storageDir . $folderName . '/';
    $uploadedFiles = $_FILES['files'];

    for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
        if ($uploadedFiles['error'][$i] === UPLOAD_ERR_OK) {
            $fileName = $uploadedFiles['name'][$i];
            $destination = $seriesPath . $fileName;

            if (move_uploaded_file($uploadedFiles['tmp_name'][$i], $destination)) {
                $exists = false;
                foreach ($data[$seriesIndex]['chapters'] as $ch) {
                    if ($ch['name'] === $fileName) {
                        $exists = true;
                        break;
                    }
                }

                if (!$exists) {
                    $data[$seriesIndex]['chapters'][] = [
                        'id' => uniqid(),
                        'name' => $fileName,
                        'fileUrl' => 'storage/' . rawurlencode($folderName) . '/' . $fileName
                    ];
                }
            }
        }
    }

    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'data' => $data[$seriesIndex]]);
    exit;
}

if ($action === 'delete_chapter') {
    $seriesId = $_POST['series_id'] ?? '';
    $chapterName = $_POST['chapter_name'] ?? '';

    $data = json_decode(file_get_contents($dataFile), true);
    foreach ($data as &$s) {
        if ($s['id'] === $seriesId) {
            $newChapters = [];
            foreach ($s['chapters'] as $ch) {
                if ($ch['name'] === $chapterName) {
                    $filePath = $storageDir . $s['folderName'] . '/' . $chapterName;
                    if (file_exists($filePath)) unlink($filePath);
                } else {
                    $newChapters[] = $ch;
                }
            }
            $s['chapters'] = $newChapters;
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
            echo json_encode(['status' => 'success', 'data' => $s]);
            exit;
        }
    }
    echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus chapter']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Aksi tidak valid']);