using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saloon.API.Data;
using Saloon.API.Models;

namespace Saloon.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalonServicesController : ControllerBase
{
    private readonly SalonDbContext _context;

    public SalonServicesController(SalonDbContext context)
    {
        _context = context;
    }

    //GET: api/salonServices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SalonService>>> GetServices()
    {
        var services = await _context.SalonServices.ToListAsync();

        return Ok(services);
    }

    //GET: api/salonService/1
    [HttpGet("{id}")]
    public async Task<ActionResult<SalonService>> GetServices(int id)
    {
        var service = await _context.SalonServices.FindAsync(id);

        if (service == null)
        {
            return NotFound();
        }

        return Ok(service);
    }

    //POST: api/SalonServices
    [HttpPost]
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
    public async Task<IActionResult> UpdateService(
        int id,
        SalonService service)
    {
        if (id != service.Id)
        {
            return BadRequest();
        }

        _context.Entry(service).State = EntityState.Modified;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    //DELETE : api/SalonServices/1
    [HttpDelete("{id}")]
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

    
}