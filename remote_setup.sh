#!/bin/bash
git clone https://github.com/Peacee1/FinanceManageWeb.git || (cd FinanceManageWeb && git pull)
cd FinanceManageWeb

# Cài đặt và khởi chạy Postgres
sudo dnf install -y postgresql15-server
sudo postgresql-setup --initdb || true

# Tạm thời đổi về 'trust' để setup DB không cần mật khẩu
sudo sed -i 's/md5/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/peer/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl restart postgresql

# Tạo DB và User
sudo -i -u postgres psql -c "CREATE DATABASE quanlychitieu;" || true
sudo -i -u postgres psql -c "ALTER USER postgres PASSWORD '123456';" || true

# Chạy script SQL
cp /home/ec2-user/FinanceManageWeb/backend/database.sql /tmp/database.sql
sudo chmod 777 /tmp/database.sql
sudo -u postgres psql -d quanlychitieu -f /tmp/database.sql

# Đổi lại thành md5 để bảo mật
sudo sed -i 's/trust/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql

# Thiết lập Backend
cd /home/ec2-user/FinanceManageWeb/backend
npm install
echo -e "PORT=5000\nJWT_SECRET=bi_mat_tren_server\nDB_USER=postgres\nDB_HOST=localhost\nDB_NAME=quanlychitieu\nDB_PASSWORD=123456\nDB_PORT=5432" > .env
pm2 restart backend-api || pm2 start index.js --name "backend-api"

# Thiết lập Frontend
cd /home/ec2-user/FinanceManageWeb/frontend
npm install
npm run build

# Thiết lập Nginx
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/* /usr/share/nginx/html/

sudo bash -c 'cat > /etc/nginx/conf.d/quanlychitieu.conf <<EOF
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)\$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    location / {
        add_header Cache-Control "no-cache, must-revalidate";
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF'

sudo systemctl restart nginx
echo "DEPLOYMENT_SUCCESS_DONE"
