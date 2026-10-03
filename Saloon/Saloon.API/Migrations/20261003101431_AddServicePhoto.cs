using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Salon.API.Migrations
{
    /// <inheritdoc />
    public partial class AddServicePhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "Photo",
                table: "SalonServices",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoContentType",
                table: "SalonServices",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Photo",
                table: "SalonServices");

            migrationBuilder.DropColumn(
                name: "PhotoContentType",
                table: "SalonServices");
        }
    }
}
