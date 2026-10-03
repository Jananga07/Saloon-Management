# Salon application

The React/Vite client is in `saloon-client`; the ASP.NET Core API and SQL Server migrations are in `Saloon.API`.

## Local development

Run the backend from `Saloon.API` with `dotnet run --launch-profile http`.
Run the frontend from `saloon-client` with `npm run dev`.
The client uses `http://localhost:5097/api` by default and must run at `http://localhost:5173` for the configured CORS policy.
The client API URL can be overridden with `VITE_API_URL`.

Before starting a new database, run `dotnet ef database update` from `Saloon.API`.

## Owner account and service management

Visit `http://localhost:5173/login`. If no owner account exists, create one with a username and a password of at least 12 characters. Owner setup is permitted only from the local computer while the backend runs in Development mode, and closes after the first account is saved. No default credentials are provided.

Sign in to open `/admin`. The dashboard shows service counts and links to Add Service, Manage Services, and View Website. Service management routes require an admin session. Creating, updating, and deleting services also require the Admin role in the API. Public service browsing remains available.

Passwords are hashed using ASP.NET Core's password hasher. Sessions use an HttpOnly cookie, expire after eight hours, and are not persistent browser cookies. The client fetches antiforgery tokens for mutations. Login and owner setup share a five-request-per-minute limit per source IP. Production cookies require HTTPS. Password recovery and multiple admin accounts are not implemented.

## Service photos

The Add Service and Edit Service forms accept optional JPEG, PNG, or WebP photos up to 5 MB, with a preview and Remove Photo button. Saving uploads the selected photo after saving the service details. If the photo fails to save, retrying updates the same service rather than creating a duplicate. Uploaded photos are stored in SQL Server and displayed on homepage service cards. Editing service details preserves the current photo; deleting a service also deletes its photo.

## Verification

Frontend: `npm run lint` and `npm run build` from `saloon-client`.
Backend: `dotnet build` from `Saloon.API`.

The PowerShell integration script `Saloon.API/tests/Test-AdminAuth.ps1` requires local SQL Server, `sqlcmd`, .NET EF tools, and free port 5098. Build the backend with `dotnet build --configuration PhotoUpdate` first. Run the script using PowerShell. It creates a uniquely named temporary database, verifies account setup, login, cookies, anonymous access restrictions, admin CRUD, photo uploads and removal, file size/type checks, antiforgery protection, logout, and rate limits, then removes that database and stops its test API. It does not create an owner account in `SaloonDB`.
