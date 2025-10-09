<?php
// ---------------------------
// Simple Upload Handler for KAZ Image Craft
// https://www.kazcms.com/en-us/kaz-image-craft
// ---------------------------

// Note: The code in this upload.php is only for testing purposes. Do not use it directly in production.

// Enable CORS if needed (optional for local dev)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

// Directory for saving uploads
$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$response = [
    'status' => 'ok',
    'uploaded' => []
];

// Loop through all possible input groups (images1[], images2[], etc.)
foreach ($_FILES as $inputName => $fileGroup) {
    if (!isset($fileGroup['name'])) continue;

    // Each input may contain multiple images
    for ($i = 0; $i < count($fileGroup['name']); $i++) {
        if ($fileGroup['error'][$i] !== UPLOAD_ERR_OK) continue;

        $tmpName = $fileGroup['tmp_name'][$i];
        $originalName = basename($fileGroup['name'][$i]);
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // Allow only image extensions
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($ext, $allowed)) continue;

        // Generate safe filename
        $newName = uniqid('img_', true) . '.' . $ext;
        $savePath = $uploadDir . $newName;

        // Move file to uploads/
        if (move_uploaded_file($tmpName, $savePath)) {
            $url = 'uploads/' . $newName; // relative path for frontend
            $response['uploaded'][] = [
                'input' => $inputName,
                'original' => $originalName,
                'saved_as' => $url
            ];
        }
    }
}

// Optional: handle existing_images[] hidden field
if (!empty($_POST['existing_images'])) {
    $response['existing'] = json_decode($_POST['existing_images'], true);
}

// Final output
if (empty($response['uploaded'])) {
    $response['status'] = 'no_files';
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
