using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Saloon.API.Data;
using Saloon.API.Models;
using System.Linq.Expressions;

namespace Saloon.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalonServicesController : ControllerBase
{
    private readonly SalonDbContext _context;
    // Do not load image bytes for service listings or forms.
    private static readonly Expression<Func<SalonService, SalonService>> Summary = service => new SalonService
    {
        Id = service.Id, Name = service.Name, Description = service.Description,
        Category = service.Category, Price = service.Price, DurationMinutes = service.DurationMinutes,
        IsActive = service.IsActive, PhotoContentType = service.PhotoContentType
    };

    public SalonServicesController(SalonDbContext context)
    {
        _context = context;
    }

    //GET: api/salonServices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SalonService>>> GetServices()
    {
        var services = await _context.SalonServices.AsNoTracking().Select(Summary).ToListAsync();

        return Ok(services);
    }

    //GET: api/salonService/1
    [HttpGet("{id}")]
    public async Task<ActionResult<SalonService>> GetServices(int id)
    {
        var service = await _context.SalonServices.AsNoTracking().Where(s => s.Id == id).Select(Summary).FirstOrDefaultAsync();

        if (service == null)
        {
            return NotFound();
        }

        return Ok(service);
    }

    //POST: api/SalonServices
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    public async Task<ActionResult<SalonService>> CreateService(
        SalonService service)
    {
        _context.SalonServices.Add(service);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetServices),
            new {id = service.Id},
            service);
    }

    //PUT: api/SalonServices/1
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateService(
        int id,
        SalonService service)
    {
        if (id != service.Id)
        {
            return BadRequest();
        }

        var existing = await _context.SalonServices.FindAsync(id);
        if (existing == null) return NotFound();
        existing.Name = service.Name;
        existing.Description = service.Description;
        existing.Category = service.Category;
        existing.Price = service.Price;
        existing.DurationMinutes = service.DurationMinutes;
        existing.IsActive = service.IsActive;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    //DELETE : api/SalonServices/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteService(int id)
    {
        var service = await _context.SalonServices.FindAsync(id);

        if (service== null)
        {
            return NotFound();

        }

        _context.SalonServices.Remove(service);

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/photo")]
    public async Task<IActionResult> GetPhoto(int id)
    {
        var photo = await _context.SalonServices.AsNoTracking()
            .Where(service => service.Id == id)
            .Select(service => new { service.Photo, service.PhotoContentType }).FirstOrDefaultAsync();
        if (photo?.Photo == null || photo.PhotoContentType == null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "no-cache";
        return File(photo.Photo, photo.PhotoContentType);
    }

    [HttpPost("{id}/photo")]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile photo)
    {
        if (photo.Length == 0 || photo.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Choose a photo no larger than 5 MB." });
        await using var stream = new MemoryStream();
        await photo.CopyToAsync(stream);
        var bytes = stream.ToArray();
        string? contentType = null;
        if (bytes.Length >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff)
            contentType = "image/jpeg";
        else if (bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
            contentType = "image/png";
        else if (bytes.Length >= 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8))
            contentType = "image/webp";
        if (contentType == null) return BadRequest(new { message = "Choose a JPEG, PNG, or WebP photo." });
        var service = await _context.SalonServices.FindAsync(id);
        if (service == null) return NotFound();
        service.Photo = bytes;
        service.PhotoContentType = contentType;
        await _context.SaveChangesAsync();
        return Ok(new { imageUrl = service.ImageUrl });
    }

    [HttpDelete("{id}/photo")]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> RemovePhoto(int id)
    {
        var service = await _context.SalonServices.FindAsync(id);
        if (service == null) return NotFound();
        service.Photo = null;
        service.PhotoContentType = null;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
