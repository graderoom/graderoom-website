## Instructions for how to setup config on new servers

- 3 A records
    - Host: @, Value: Server IP: TTL: Automatic
    - Host: www, Value: Server IP: TTL: Automatic
    - Host: beta, Value: Server IP: TTL: Automatic

- Lets Encrypt (todo)

- Nginx

- To redirect all requests to https:
```
server {
    listen 80 default_server;

    server_name _;

    return 301 https://$host$request_uri;
}
```

- To host a subdomain (i.e. beta.graderoom.me): (Note that the ports 5996 and 5998 depends on what HTTP ports the apps are hosted on, the apps are on HTTP, not HTTPS. Also, note that a subdomain requires its own SSL cert in most cases.)
```
server {
    listen 443 ssl default_server;
    server_name graderoom.me www.graderoom.me;

    ssl_certificate /etc/letsencrypt/live/graderoom.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/graderoom.me/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5996;
        proxy_http_version 1.1;
        proxy_set_header Host      $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name beta.graderoom.me;

    ssl_certificate /etc/letsencrypt/live/beta.graderoom.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beta.graderoom.me/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5998;
        proxy_http_version 1.1;
        proxy_set_header Host      $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- Commands to know
    - `sudo nginx` starts nginx
    - `sudo nginx -s stop` stops nginx