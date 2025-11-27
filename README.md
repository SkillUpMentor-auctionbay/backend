# Auction Bay API

<div align="center" style="padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 2rem;">
  <h1 style="margin: 0; font-size: 2.5rem; font-weight: 300;">Auction Bay API</h1>
  <p style="margin: 1rem 0; font-size: 1.1rem; opacity: 0.9;">A comprehensive auction management system API</p>
</div>

## Quick Links

<div style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">

<a href="https://auction-bay-backend.onrender.com/" target="_blank" style="background: #28a745; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem;">
  🚀 Live API
</a>

<a href="https://auction-bay-backend.onrender.com/docs" target="_blank" style="background: #007bff; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem;">
  📚 Interactive Documentation
</a>

</div>

## Authentication

The API uses **JWT Bearer Token** authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow
1. Login with `/auth/v1/login` to receive a JWT token
2. Include the token in the Authorization header for protected endpoints
3. Use `/auth/v1/logout` to invalidate the session

## API Endpoints

### Authentication Module
<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
<h4 style="color: #495057; margin-top: 0;">🔐 Public Endpoints (No Authentication Required)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
  <thead>
    <tr style="background: #e9ecef;">
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Method</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Endpoint</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/login</code></td>
      <td style="padding: 0.75rem;">User login</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/signup</code></td>
      <td style="padding: 0.75rem;">User registration</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/forgot-password</code></td>
      <td style="padding: 0.75rem;">Request password reset</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/reset-password</code></td>
      <td style="padding: 0.75rem;">Reset password with token</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/verify-reset-token</code></td>
      <td style="padding: 0.75rem;">Verify reset token</td>
    </tr>
  </tbody>
</table>

<h4 style="color: #495057; margin-top: 1.5rem;">🔒 Protected Endpoints (JWT Required)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
  <thead>
    <tr style="background: #e9ecef;">
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Method</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Endpoint</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auth/v1/logout</code></td>
      <td style="padding: 0.75rem;">User logout</td>
    </tr>
  </tbody>
</table>
</div>

### Users Module
<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
<h4 style="color: #495057; margin-top: 0;">👤 User Management (JWT Required)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
  <thead>
    <tr style="background: #e9ecef;">
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Method</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Endpoint</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me</code></td>
      <td style="padding: 0.75rem;">Get current user profile</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>PATCH</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me/update-profile</code></td>
      <td style="padding: 0.75rem;">Update user profile</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me/statistics</code></td>
      <td style="padding: 0.75rem;">Get user statistics</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>PATCH</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me/update-password</code></td>
      <td style="padding: 0.75rem;">Update password</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>PATCH</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me/change-profile-picture</code></td>
      <td style="padding: 0.75rem;">Upload profile picture (5MB max)</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>DELETE</code></td>
      <td style="padding: 0.75rem;"><code>/users/v1/me/remove-profile-picture</code></td>
      <td style="padding: 0.75rem;">Remove profile picture</td>
    </tr>
  </tbody>
</table>
</div>

### Auctions Module
<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
<h4 style="color: #495057; margin-top: 0;">🏪 Auction Management (JWT Required)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
  <thead>
    <tr style="background: #e9ecef;">
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Method</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Endpoint</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/me/auction</code></td>
      <td style="padding: 0.75rem;">Create auction</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/:id/upload-image</code></td>
      <td style="padding: 0.75rem;">Upload auction image (5MB max)</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>DELETE</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/:id/delete-image</code></td>
      <td style="padding: 0.75rem;">Delete auction image</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>PATCH</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/me/auction/:id</code></td>
      <td style="padding: 0.75rem;">Update auction</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>DELETE</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/me/auction/:id</code></td>
      <td style="padding: 0.75rem;">Delete auction</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1</code></td>
      <td style="padding: 0.75rem;">List auctions (filter: OWN, BID, WON)</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/:id</code></td>
      <td style="padding: 0.75rem;">Get auction details</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>POST</code></td>
      <td style="padding: 0.75rem;"><code>/auctions/v1/:id/bid</code></td>
      <td style="padding: 0.75rem;">Place bid</td>
    </tr>
  </tbody>
</table>
</div>

### Notifications Module
<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
<h4 style="color: #495057; margin-top: 0;">🔔 Notifications (JWT Required)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
  <thead>
    <tr style="background: #e9ecef;">
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Method</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Endpoint</th>
      <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/notifications/v1</code></td>
      <td style="padding: 0.75rem;">Get user notifications</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>PATCH</code></td>
      <td style="padding: 0.75rem;"><code>/notifications/v1/clear-all</code></td>
      <td style="padding: 0.75rem;">Clear all notifications</td>
    </tr>
    <tr style="border-bottom: 1px solid #dee2e6;">
      <td style="padding: 0.75rem;"><code>GET</code></td>
      <td style="padding: 0.75rem;"><code>/notifications/v1/stream</code></td>
      <td style="padding: 0.75rem;">Real-time notifications (SSE)</td>
    </tr>
  </tbody>
</table>
</div>


## Technical Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport.js
- **Documentation**: Swagger/OpenAPI 3.0
- **File Storage**: ImageKit integration
- **Real-time**: Server-Sent Events (SSE)


**Author**: Maks Klemenčič
**License**: UNLICENSED