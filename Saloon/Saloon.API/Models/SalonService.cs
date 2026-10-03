using System.ComponentModel.DataAnnotations;

namespace Saloon.API.Models;

public class SalonService
{
    public int Id {get; set;}

    public string Name {get; set;} = string.Empty;

    public string Description {get; set;} = string.Empty;

    [Required]
    [RegularExpression("^(Gents|Ladies|Unisex)$", ErrorMessage = "Category must be Gents, Ladies, or Unisex.")]
    public string Category { get; set; } = "Unisex";

    public decimal Price {get; set; }

    public int DurationMinutes { get; set;}

    public bool IsActive {get; set; } = true;
}
