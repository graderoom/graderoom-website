/* This file should go in the root directory, at the same level as the graderoom and graderoom_beta */

module.exports = {
    apps: [{
        name: "beta",
        script: "graderoom.js",
        exec_mode: "fork",
        cwd: "/home/ec2-user/graderoom_beta",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",
        env: {
            NODE_ENV: "production",
            port: 5998,
            SGMAILAPI: "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"
        }
    }, {
        name: "stable",
        script: "graderoom.js",
        exec_mode: "fork",
        cwd: "/home/ec2-user/graderoom",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",
        env: {
            NODE_ENV: "production",
            port: 5996,
            SGMAILAPI: "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"
        }
    }]
};
