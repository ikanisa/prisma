-- Dump example table to CSV
\copy (SELECT * FROM example) TO 'example_backup.csv' CSV HEADER;
