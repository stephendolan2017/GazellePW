<?php
authorize();

$UserID = $LoggedUser['ID'];
$Artist1ID = db_string($_POST['artistid']);
$Artist2ID = db_string($_POST['similar_artistid']);

if (!is_number($Artist1ID)) {
	error(0);
}

if (empty($Artist2ID)) {
	error('Blank artist id.');
}

$DB->query("
	SELECT ArtistID
	FROM artists_group
	WHERE ArtistID LIKE '$Artist2ID'");
list($Artist2ID) = $DB->next_record();

if (!empty($Artist2ID)) { // artist was found in the database

	// Let's see if there's already a similar artists field for these two
	$DB->query("
		SELECT s1.SimilarID
		FROM artists_similar AS s1
			JOIN artists_similar AS s2 ON s1.SimilarID = s2.SimilarID
		WHERE s1.ArtistID = '$Artist1ID'
			AND s2.ArtistID = '$Artist2ID'");
	list($SimilarID) = $DB->next_record();

	if ($SimilarID) { // The similar artists field already exists, just update the score
		$DB->query("
			UPDATE artists_similar_scores
			SET Score = Score + 200
			WHERE SimilarID = '$SimilarID'");
	} else { // No, it doesn't exist - create it
		$DB->query("
			INSERT INTO artists_similar_scores (Score)
			VALUES ('200')");
		$SimilarID = $DB->inserted_id();
		$DB->query("
			INSERT INTO artists_similar (ArtistID, SimilarID)
			VALUES ('$Artist1ID', '$SimilarID')");
		$DB->query("
			INSERT INTO artists_similar (ArtistID, SimilarID)
			VALUES ('$Artist2ID', '$SimilarID')");
	}

	$DB->query("
		SELECT SimilarID
		FROM artists_similar_votes
		WHERE SimilarID = '$SimilarID'
			AND UserID = '$UserID'
			AND Way = 'up'");
	if (!$DB->has_results()) {
		$DB->query("
			INSERT INTO artists_similar_votes (SimilarID, UserID, way)
			VALUES ('$SimilarID', '$UserID', 'up')");
	}

	$Cache->delete_value("artist_$Artist1ID"); // Delete artist cache
	$Cache->delete_value("artist_$Artist2ID"); // Delete artist cache
	$Cache->delete_value("similar_positions_$Artist1ID"); // Delete artist's similar map cache
	$Cache->delete_value("similar_positions_$Artist2ID"); // Delete artist's similar map cache
}

$Location = (empty($_SERVER['HTTP_REFERER'])) ? "artist.php?id={$Artist1ID}" : $_SERVER['HTTP_REFERER'];
header("Location: {$Location}");
