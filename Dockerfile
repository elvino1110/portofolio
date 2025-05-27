# Gunakan image nginx untuk hosting static files
FROM nginx:alpine

# Salin semua file ke direktori html default NGINX
COPY . /usr/share/nginx/html

# Expose port 80 (Cloud Run akan mengatur ini)
EXPOSE 80