# Database Export

`database_backup.sql` is a full export (schema + data) of the ECPro Rental Services PostgreSQL database, created with `pg_dump`.

To restore into a fresh PostgreSQL database:

```bash
psql "$DATABASE_URL" < data_export/database_backup.sql
```
