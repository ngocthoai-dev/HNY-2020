<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>user</title>
</head>
<body>
<?php
	echo $_GET['nameUser'] . "<br />";
  $conn = new mysqli("sql302.byethost.com", "b3_24235450", "thoai@123", "b3_24235450_SEdb") or die("Cant connect database!");
  mysqli_query($conn, "set names utf8");
	$result = mysqli_query($conn, "SELECT count(id) FROM WISH");
  $noId = $result->fetch_row();
	$query = "INSERT INTO WISH(id, msg) VALUES (" . $noId[0] . ", '" . $_GET['nameUser'] . "')";
	$result = mysqli_query($conn, $query) or die("Cant insert to db");
  $result->close();    
  $conn->close();
?>
</body>
</html>