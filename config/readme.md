## Instructions for how to setup config on new servers

- 3 A records
    - Host: @, Value: Server IP: TTL: Automatic
    - Host: www, Value: Server IP: TTL: Automatic
    - Host: beta, Value: Server IP: TTL: Automatic

- Lets Encrypt
    - Ensure python is installed on the server
    - Download the letsencrypt bot: `git clone https://github.com/letsencrypt/letsencrypt /opt/letsencrypt`
    - Run it: `/opt/letsencrypt/letsencrypt-auto --debug`
        - Important: If you get this output: `Sorry, I don't know how to bootstrap Certbot on your operating system!
` then Edit the file `/opt/letsencrypt/certbot-auto` to recognize your version of Linux. 
            - `sudo vim /opt/letsencrypt/certbot-auto`
            - find this line in the file (likely near line nr 780):
              `elif [ -f /etc/redhat-release ]; then`
              and replace whole line with this:
            - `elif [ -f /etc/redhat-release ] || grep 'cpe:.*:amazon_linux:2' /etc/os-release > /dev/null 2>&1; then`
            - Save and quit (:wq in normal mode)
    - Create a config file to sign the certificates at `/etc/letsencrypt/config.ini`
        - `echo "rsa-key-size = 4096" >> /etc/letsencrypt/config.ini`
        - `echo "email = ________@____.com" >> /etc/letsencrypt/config.ini`
    - `opt/letsencrypt/letsencrypt-auto certonly --debug --webroot -w /var/www/_______ -d _______.com -d www._______.com --config /etc/letsencrypt/config.ini --agree-tos `
    
    - Once the first time setup is done, run either:
        - `/opt/letsencrypt/letsencrypt-auto certonly --debug -d graderoom.me -d www.graderoom.me --config /etc/letsencrypt/config.ini --agree-tos`        - `/opt/letsencrypt/letsencrypt-auto certonly --debug -d graderoom.me -d www.graderoom.me --config /etc/letsencrypt/config.ini --agree-tos`
        - `/opt/letsencrypt/letsencrypt-auto certonly --debug -d beta.graderoom.me --config /etc/letsencrypt/config.ini --agree-tos`
        - make sure nginx is stopped, then choose option 2 (spin up temporary server) (TODO look into different options)
        
    - Optionally, set up a cron job to periodically regen certificates, but this requires non manual runthrough of the cert gen (TODO)
        
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
