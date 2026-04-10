
### Solution

Fix permissions by matching the container user's UID:

```bash
# 1. Start the container temporarily
docker-compose up -d

# 2. Get the container user's UID
docker exec -it icoach-server id -u nodejs
# Example output: 1001

# 3. Stop the container
docker-compose down

# 4. Use the UID from step 2 (replace 1001 with your actual UID)
sudo chown -R 1001:1001 keys/

# 5. Set correct file permissions
chmod 755 keys/
chmod 600 keys/private.pem
chmod 644 keys/public.pem

# 6. Restart containers
docker-compose up -d

# Locally

# Change ownership back to your user
sudo chown -R youssef:youssef keys/

# Or dynamically using your current user
sudo chown -R $(whoami):$(whoami) keys/

# Set correct permissions for local development
chmod 755 keys/
chmod 600 keys/private.pem
chmod 644 keys/public.pem