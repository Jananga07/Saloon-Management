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

## Appointment booking

Customers can open `/book` or click Book Now on a service card. The page loads active services from the real API, lets customers choose Gents, Ladies, or Unisex services, and displays available appointment times. Name and phone are required; email and notes are optional. Prices use Sri Lankan rupees. No customer login is required.

Opening hours match the website: Monday–Saturday, 09:00–20:00; Sunday, 10:00–18:00. Dates and times use Asia/Colombo. Starts are offered every 30 minutes, at least 30 minutes ahead, up to 90 days ahead. A service must finish before closing time. Opening hours are currently defined in `BookingsController.cs` and shown in `BookAppointment.jsx`.

Appointments start as Pending and receive a booking reference. Customers should save the reference; the owner contacts them manually to confirm. No email/SMS notifications or online payments are sent by this workflow.

Admins open Dashboard → Manage Appointments (`/admin/bookings`) to view customer contact details, filter by date/status, and confirm or cancel requests. Pending and Confirmed bookings occupy their entire service duration; cancellation frees the time. Cancelled appointments cannot be reopened. Service name, category, price, and duration are saved with the appointment so subsequent service changes or deletion preserve its history.

This first version supports one appointment at a time across the salon. Staff-specific capacity, holiday closures, customer self-service cancellation, rescheduling, and reminders are not implemented. Booking mutations use a transaction-owned SQL Server application lock to prevent simultaneous overlapping requests. Request keys prevent duplicate bookings when a submission is retried.

## Verification

Frontend: `npm run lint` and `npm run build` from `saloon-client`.
Backend: `dotnet build` from `Saloon.API`.

The PowerShell integration script `Saloon.API/tests/Test-AdminAuth.ps1` requires local SQL Server, `sqlcmd`, .NET EF tools, and free port 5098. Build the backend with `dotnet build --configuration BookingUpdate` first. Run the script using PowerShell. It creates a uniquely named temporary database and verifies admin authentication, service/photo management, guest bookings, availability, validation, idempotent retries, simultaneous overlapping requests, admin confirmation/cancellation, and appointment history after service deletion. It removes that database and stops its test API afterward. It does not create an owner account or test bookings in `SaloonDB`.
