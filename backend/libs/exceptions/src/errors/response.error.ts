import { HttpStatus } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponse {
  @ApiProperty({
    example: "Example field is required.",
  })
  readonly message: string;
  @ApiProperty({ example: HttpStatus.UNPROCESSABLE_ENTITY })
  readonly field: string;
}

export class ErrorsResponse {
  @ApiProperty({
    example: [
      {
        message: "Example field is required.",
        field: "example_field",
      },
    ],
    isArray: true,
    type: ErrorResponse,
  })
  readonly errors: ErrorResponse[];

  @ApiProperty({ example: HttpStatus.UNPROCESSABLE_ENTITY })
  readonly status: number;
}
