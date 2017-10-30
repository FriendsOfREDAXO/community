#!/usr/bin/php
<?php

// get arguments from command line
$options = getopt("n:");

// set number of items
$numberOfItems = 10;
if (isset($options['n'])) {
    $numberOfItems = (int)$options['n'];
};

// parse dummy data file
$dummyDataFile = '.data.example.yml';
$dummyData = '';
if (file_exists($dummyDataFile)) {
    $dummyData = file_get_contents($dummyDataFile);
}
if (empty($dummyData)) {
    echo "abort: empty dummy data.\r\n";
    exit;
}

// generate data items
$count = 0;
for ($i = 1; $i <= $numberOfItems; $i++) {

    if (!is_dir('data/' . $i)) {
        mkdir('data/' . $i, 0755);
    }

    $content = $dummyData;

    // replace data
    $content = preg_replace('/name:(.*)/i', 'name: Someone ' . $i, $content);
    $content = preg_replace('/latitude:(.*)/i', 'latitude: ' . rand(45000, 53000) / 1000, $content);
    $content = preg_replace('/longitude:(.*)/i', 'longitude: ' . rand(5000, 17000) / 1000, $content);
//    $content = preg_replace('/bio:(.*)/i', 'bio: ' . trim(substr('Lorem ipsum dolor sit amet consectetuer adipiscing elit aenean commodo ligula eget dolor aenean massa cum sociis natoque penatibus et magnis dis parturient montes', 0, rand(19, 159))) . '.', $content);

    // save
    file_put_contents('data/' . $i . '/data.yml', $content);

    // copy image
    copy('.image.example.jpg', 'data/' . $i . '/johndoe.jpg');

    $count++;
}
echo "generated {$count} number of data items!\r\n";
