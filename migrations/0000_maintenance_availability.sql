ALTER TABLE "cars" ADD COLUMN "maintenance_reason" text;
--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "maintenance_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "maintenance_updated_by" varchar;
--> statement-breakpoint
ALTER TABLE "cars"
  ADD CONSTRAINT "cars_maintenance_updated_by_users_id_fk"
  FOREIGN KEY ("maintenance_updated_by")
  REFERENCES "public"."users"("id")
  ON DELETE set null
  ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "car_switches" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "rental_id" integer NOT NULL,
  "old_car_id" integer NOT NULL,
  "new_car_id" integer NOT NULL,
  "reason" text NOT NULL,
  "user_id" varchar NOT NULL,
  "switched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_switches"
  ADD CONSTRAINT "car_switches_rental_id_rentals_id_fk"
  FOREIGN KEY ("rental_id")
  REFERENCES "public"."rentals"("id")
  ON DELETE restrict
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "car_switches"
  ADD CONSTRAINT "car_switches_old_car_id_cars_id_fk"
  FOREIGN KEY ("old_car_id")
  REFERENCES "public"."cars"("id")
  ON DELETE restrict
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "car_switches"
  ADD CONSTRAINT "car_switches_new_car_id_cars_id_fk"
  FOREIGN KEY ("new_car_id")
  REFERENCES "public"."cars"("id")
  ON DELETE restrict
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "car_switches"
  ADD CONSTRAINT "car_switches_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "car_switches_rental_time_idx"
  ON "car_switches" USING btree ("rental_id", "switched_at");
