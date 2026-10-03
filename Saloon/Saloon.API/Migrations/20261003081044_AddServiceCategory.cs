using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Salon.API.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "SalonServices",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Unisex");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Category", table: "SalonServices");
        }
    }
}
