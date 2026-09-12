import { getDb } from "@mindmetric/db";
import { Global, Module } from "@nestjs/common";

export const DATABASE = "DATABASE";

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => getDb(),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
