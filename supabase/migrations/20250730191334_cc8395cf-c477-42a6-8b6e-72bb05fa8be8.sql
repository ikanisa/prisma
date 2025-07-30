-- Remove irrelevant payment action buttons that confuse agent learning
DELETE FROM action_buttons 
WHERE label IN ('💰 Pay Bills', '📋 Check Payment Status') 
AND domain = 'payments';