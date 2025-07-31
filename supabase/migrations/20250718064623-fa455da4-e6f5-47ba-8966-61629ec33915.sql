-- Add foreign key constraint for businesses.owner_user_id -> users.id
ALTER TABLE businesses 
ADD CONSTRAINT businesses_owner_user_id_fkey 
FOREIGN KEY (owner_user_id) REFERENCES users(id);