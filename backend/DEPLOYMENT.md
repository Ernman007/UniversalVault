# Backend Deployment Guide

This guide explains how to prepare and deploy the banking system backend.

## Architecture Overview

The backend is built with:
- Node.js/Express.js for the API server
- MongoDB Atlas for the database
- GridFS for persistent file storage (images, documents)
- Socket.IO for real-time communications
- JWT for authentication
- Middleware for auth and admin protection

Key features:
- RESTful API endpoints for banking operations
- Real-time notifications via WebSocket
- File upload handling for support tickets
- Role-based access control (admin/user)
- Activity logging and monitoring

1. **Environment Variables**
   Set the following environment variables in your deployment platform (e.g. Railway):
   ```
   NODE_ENV=production
   PORT=5000 (Or let the platform assign it)
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key
   ADMIN_EMAIL=default_admin@email.com
   ADMIN_PASSWORD=secure_admin_password
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   FRONTEND_URL=https://your-frontend.vercel.app
   CORS_CREDENTIALS=true
   ENCRYPTION_KEY=your_32_character_encryption_key_for_loans
   ```

2. **Database Preparation (MongoDB Atlas)**
   - Set up a production MongoDB Atlas cluster.
   - Go to **Network Access** and add `0.0.0.0/0` (Allow access from anywhere) so Railway and Vercel can connect dynamically.
   - Create a database user and get your connection string.

3. **Security Measures**
   - Ensure the `JWT_SECRET` and `ENCRYPTION_KEY` are strong, random strings.
   - CORS is dynamically configured via `ALLOWED_ORIGINS`.

4. **Frontend Configuration (Vercel)**
   - In `bankapp-ui/src/environments/environment.ts`, make sure to update `apiUrl` and `wsUrl` to point to your Railway domain (e.g., `https://your-backend.up.railway.app`).
   - If using PWA features, note that `ngsw-config.json` might need to be explicitly configured for cross-origin URLs if you plan to cache API responses.
   ```bash
   # Install dependencies
   npm install

   # Remove development dependencies
   npm prune --production
   ```

5. **Performance Optimization**
   - Enable compression
   - Implement caching strategies
   - Set up proper logging
   - Configure error handling

## Deployment Steps

### Backend Deployment (Railway)

1. Create a [Railway](https://railway.app/) account and link your GitHub repository.
2. Create a new "Project" and choose "Deploy from GitHub repo".
3. Select this repository and target the `backend` folder as the root directory (you may need to configure a custom start command: `cd backend && npm install && npm start`).
4. Go to the "Variables" tab in Railway and input all the environment variables listed in the checklist above.
5. Railway will automatically build and deploy. Once complete, copy the generated Domain (`xyz.up.railway.app`).

### Frontend Deployment (Vercel)

1. Create a [Vercel](https://vercel.com/) account and link your GitHub repository.
2. Import the project and set the Root Directory to `bankapp-ui`.
3. Vercel will automatically detect the Angular framework and configure the build command (`npm run build`) and output directory (`dist/bankapp-ui/browser`).
4. **Important**: Before deploying, update `bankapp-ui/src/environments/environment.ts` with the Railway URL you generated in the backend step.
5. Deploy the application.

### Image Storage (GridFS)

The application has been configured to use `GridFS` (via `multer-gridfs-storage`) for file uploads instead of the local filesystem. This means user documents, support ticket attachments, and loan applications are safely stored *inside* your MongoDB Atlas database. You do not need an external bucket like Amazon S3 or Cloudinary.

## Monitoring and Maintenance

1. **Monitoring Setup**
   - Set up PM2 monitoring
   - Configure error logging
   - Set up performance monitoring
   - Monitor database performance

2. **Backup Strategy**
   - Regular database backups
   - Configuration backups
   - Document backup procedures

3. **Update Procedure**
   ```bash
   # Pull latest changes
   git pull origin main

   # Install dependencies
   npm install --production

   # Restart application
   pm2 restart banking-api
   ```

## Scaling Considerations

1. **Horizontal Scaling**
   - Load balancing setup
   - Session management across instances
   - WebSocket scaling with Redis adapter
   - Database replication

2. **Vertical Scaling**
   - Monitor resource usage
   - Upgrade server resources as needed
   - Optimize database queries
   - Implement caching strategies

## Troubleshooting

1. **Common Issues**
   - Check logs: `pm2 logs banking-api`
   - Monitor errors: `pm2 monit`
   - Check server resources
   - Verify database connectivity

2. **Recovery Procedures**
   - Document rollback procedures
   - Keep backup deployment ready
   - Maintain emergency contacts

## Security Checklist

1. **Regular Updates**
   - Keep dependencies updated
   - Apply security patches
   - Review security best practices

2. **Access Control**
   - Review admin access
   - Audit user permissions
   - Monitor suspicious activities

3. **Data Protection**
   - Encrypt sensitive data
   - Regular security audits
   - Implement rate limiting
   - Set up firewall rules

## Rollback Procedures

If a deployment fails or causes issues, you can use the rollback script to revert to the previous working version:

```bash
node scripts/rollback.js
```

The rollback process will:
1. Stop the current application
2. Restore the most recent database backup
3. Switch back to the previous deployment version
4. Restart the application using PM2

### Manual Rollback Steps

In case the automated rollback fails:

1. **Stop Current Application**
   ```bash
   pm2 stop banking-api
   ```

2. **Restore Database Backup**
   ```bash
   # Extract latest backup
   cd backups
   tar -xzf db-backup-[timestamp].tar.gz
   
   # Restore using mongorestore
   mongorestore --uri="your_mongodb_uri" --drop ./db-backup-[timestamp]
   ```

3. **Switch to Previous Version**
   ```bash
   cd deployments/deployment-[previous-version]
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

4. **Verify Recovery**
   - Check application logs: `pm2 logs banking-api`
   - Monitor application status: `pm2 monit`
   - Test critical functionalities
   - Verify database consistency

### Emergency Contacts

Maintain a list of emergency contacts in case of deployment issues:
- DevOps Team Lead
- Database Administrator
- System Administrator
- Application Development Lead