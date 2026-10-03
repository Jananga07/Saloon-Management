using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Saloon.API.Models;

public class AdminUser
{
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int Id { get; set; } = 1;

    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;
}
