--
-- PostgreSQL database dump
--

\restrict 3W9GTm4ECKnFo6nvCVeye7JiJq549fwGS4pH6PoSskchHWMbdeJkRE1JBP6pkMl

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    model character varying(255) NOT NULL,
    plate_number character varying(50) NOT NULL,
    color character varying(50) NOT NULL,
    color_code character varying(7) NOT NULL,
    monthly_payment numeric(10,2) NOT NULL,
    last_oil_change_mileage integer DEFAULT 0,
    current_mileage integer DEFAULT 0,
    oil_change_interval_km integer DEFAULT 5000,
    last_maintenance_date date,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    image_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    brand character varying(100),
    date_acquired date,
    registration_confirmed_at date,
    oil_change_interval_days integer DEFAULT 180 NOT NULL,
    display_order integer
);


--
-- Name: cars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cars ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    id_number character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.customers ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: edit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edit_logs (
    id integer NOT NULL,
    car_id integer NOT NULL,
    user_id character varying NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    edited_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edit_logs_id_seq OWNED BY public.edit_logs.id;


--
-- Name: expense_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_logs (
    id integer NOT NULL,
    expense_id integer,
    car_id integer NOT NULL,
    user_id character varying NOT NULL,
    action character varying(50) NOT NULL,
    field_name character varying(100),
    old_value text,
    new_value text,
    category character varying(100),
    description text,
    amount character varying(50),
    expense_date character varying(20),
    mileage_at_expense character varying(50),
    car_name character varying(255),
    logged_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expense_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    car_id integer NOT NULL,
    user_id character varying NOT NULL,
    category character varying(100) NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    mileage_at_expense integer,
    expense_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expenses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: monthly_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_payments (
    id integer NOT NULL,
    car_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT '0'::numeric,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: monthly_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.monthly_payments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.monthly_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rental_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_logs (
    id integer NOT NULL,
    rental_id integer,
    car_id integer NOT NULL,
    user_id character varying NOT NULL,
    action character varying(50) NOT NULL,
    field_name character varying(100),
    old_value text,
    new_value text,
    customer_name character varying(255),
    start_date character varying(20),
    end_date character varying(20),
    total_amount character varying(50),
    car_name character varying(255),
    logged_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rental_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rental_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rental_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rental_logs_id_seq OWNED BY public.rental_logs.id;


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rentals (
    id integer NOT NULL,
    car_id integer NOT NULL,
    user_id character varying NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_email character varying(255),
    customer_phone character varying(50),
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_rented integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_screenshot_url character varying(500),
    is_finalized boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    customer_id integer,
    last_finalize_reminder timestamp without time zone,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_date date,
    payment_bank character varying(100),
    reservation_fee numeric(10,2),
    reservation_status character varying(20) DEFAULT 'none'::character varying NOT NULL,
    reservation_date date,
    reservation_bank character varying(100),
    reservation_screenshot_url character varying(500)
);


--
-- Name: rentals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rentals ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rentals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(100),
    password character varying(255),
    is_approved boolean DEFAULT false NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL
);


--
-- Name: edit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_logs ALTER COLUMN id SET DEFAULT nextval('public.edit_logs_id_seq'::regclass);


--
-- Name: rental_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_logs ALTER COLUMN id SET DEFAULT nextval('public.rental_logs_id_seq'::regclass);


--
-- Data for Name: cars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cars (id, name, model, plate_number, color, color_code, monthly_payment, last_oil_change_mileage, current_mileage, oil_change_interval_km, last_maintenance_date, status, image_url, created_at, updated_at, brand, date_acquired, registration_confirmed_at, oil_change_interval_days, display_order) FROM stdin;
5	Everest	Ford	EV-001	Black	#1a1a1a	52000.00	0	0	5000	\N	available	https://replusercontent.com/stored/glossy_black_car_-_everest.png	2025-12-02 12:57:05.778287	2025-12-02 12:57:05.778287	\N	\N	\N	180	\N
3	Terra O	Toyota	NHO 1370	Black	#1a1a1a	39000.00	0	2500	5000	\N	available	https://replusercontent.com/stored/glossy_black_car_-_terra_o.png	2025-12-02 12:57:05.778287	2026-01-05 14:49:03.119	\N	\N	\N	180	\N
1	Terra N	Toyota	NHU 2608	Black	#1a1a1a	42000.00	0	0	5000	\N	available	https://replusercontent.com/stored/glossy_black_car_-_terra_n.png	2025-12-02 12:57:05.778287	2026-01-05 14:49:52.532	\N	\N	\N	180	\N
4	Innova	Toyota	NIO 8797	Black	#1a1a1a	29000.00	0	0	5000	\N	available	https://replusercontent.com/stored/glossy_black_car_-_innova.png	2025-12-02 12:57:05.778287	2026-01-05 14:50:33.063	\N	\N	\N	180	\N
6	Hilux	Toyota	NFK 4247	Black	#1a1a1a	38000.00	84300	84300	5000	2026-01-11	available	https://replusercontent.com/stored/glossy_black_car_-_hilux.png	2025-12-02 12:57:05.778287	2026-01-11 13:39:00.315	\N	\N	\N	180	\N
9	GAC M6	GAC	GM-001	Black	#1a1a1a	36000.00	0	0	5000	\N	available	\N	2025-12-02 13:07:43.722189	2026-04-29 17:03:05.644	\N	\N	\N	180	\N
2	MUX	Chevrolet	DAH 2846	Black	#1a1a1a	34000.00	5000	5000	5000	2026-01-05	available	https://replusercontent.com/stored/glossy_black_car_-_mux.png	2025-12-02 12:57:05.778287	2026-04-30 15:37:04.868	\N	\N	\N	180	\N
7	Fortuner	Toyota	FR-001	Black	#1a1a1a	38000.00	0	0	5000	\N	available	https://replusercontent.com/stored/glossy_black_car_-_fortuner.png	2025-12-02 12:57:05.778287	2026-06-03 17:19:37.958	\N	\N	\N	180	\N
10	EVEREST BLUE	FORD	FX548B	BLUE	#6366F1	50000.00	0	0	5000	\N	available	\N	2026-06-06 01:14:32.128169	2026-06-06 01:14:32.128169	\N	2026-05-04	\N	180	\N
8	Veloz	Suzuki	VZ-001	Black	#1a1a1a	27000.00	41000	0	5000	2026-07-07	available	https://replusercontent.com/stored/glossy_black_car_-_veloz.png	2025-12-02 12:57:05.778287	2026-07-07 01:40:23.012	Toyota	\N	\N	180	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, name, email, phone, address, id_number, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edit_logs (id, car_id, user_id, field_name, old_value, new_value, edited_at) FROM stdin;
1	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Current Mileage	0	123	2025-12-02 17:09:11.750832
2	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Current Mileage	123	999	2025-12-02 17:11:32.113472
3	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Current Mileage	0	5000	2025-12-02 17:16:22.914901
4	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Current Mileage	0	1000	2025-12-02 17:19:56.768264
5	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Current Mileage	0	2500	2025-12-02 17:23:17.067503
6	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Plate Number	HX-001	NFK 4247	2026-01-05 14:42:40.706501
7	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Current Mileage	1000	84300	2026-01-05 14:42:40.741416
8	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Plate Number	TO-001	NHO 1370	2026-01-05 14:49:03.169809
9	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Plate Number	MX-001	DAH 2846	2026-01-05 14:49:30.589553
10	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Plate Number	TN-001	NHU 2608	2026-01-05 14:49:52.581675
11	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Plate Number	IN-001	NIO 8797	2026-01-05 14:50:33.11471
12	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Registration Confirmed		2024-01-01	2026-04-29 17:02:42.886696
13	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Registration Confirmed	2024-01-01		2026-04-29 17:03:05.680298
14	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Oil Change Interval (days)	180	365	2026-04-30 15:37:04.907617
\.


--
-- Data for Name: expense_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_logs (id, expense_id, car_id, user_id, action, field_name, old_value, new_value, category, description, amount, expense_date, mileage_at_expense, car_name, logged_at) FROM stdin;
1	12	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	created	\N	\N	\N	Test Category	Test logging	500.00	2026-04-28	\N	MUX	2026-04-28 21:25:49.355198
2	12	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	description	Test logging	Test logging edited	Test Category	Test logging edited	750.00	2026-04-28	\N	MUX	2026-04-28 21:25:56.03929
3	12	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	amount	500.00	750.00	Test Category	Test logging edited	750.00	2026-04-28	\N	MUX	2026-04-28 21:25:56.061524
4	\N	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	Test Category	Test logging edited	750.00	2026-04-28	\N	MUX	2026-04-28 21:25:56.275513
5	13	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	created	\N	\N	\N	TestCat	verify edit	100.00	2026-04-28	\N	MUX	2026-04-28 21:28:12.243391
6	13	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	description	verify edit	verify edit done	TestCat	verify edit done	200.00	2026-04-28	\N	MUX	2026-04-28 21:28:12.583354
7	13	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	amount	100.00	200.00	TestCat	verify edit done	200.00	2026-04-28	\N	MUX	2026-04-28 21:28:12.606461
8	\N	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	TestCat	verify edit done	200.00	2026-04-28	\N	MUX	2026-04-28 21:28:12.829471
9	14	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Repair	BREAK PADS ROTOR DISC	27000.00	2026-04-30	\N	Terra N	2026-04-30 13:22:56.559404
10	15	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	created	\N	\N	\N	Oil Change	included on 27k payment, maintenance	0.01	2026-04-30	\N	Terra N	2026-04-30 13:33:25.922226
11	16	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Maintenance	5400 - Battery\n4800 - Electric Repair fuse\n3600 - Change oil	13800.00	2026-05-15	90000	MUX	2026-05-15 13:36:33.630006
12	17	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Oil Change	PMS 60k\nCHANGE OIL\nBREAKPADS\nFILTERS	10900.00	2026-06-15	\N	Terra O	2026-06-15 13:40:22.170847
13	18	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Other	DASH CAM GPS	7000.00	2026-06-24	\N	EVEREST BLUE	2026-06-23 16:11:29.672855
14	19	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Maintenance	Change battery	7000.00	2026-07-03	\N	Terra O	2026-07-03 11:34:30.247536
15	20	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Maintenance	washer fluid hose	8000.00	2026-07-03	\N	Everest	2026-07-03 11:35:20.586591
16	21	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Repair	Change front film tint	1200.00	2026-07-07	\N	Innova	2026-07-07 01:39:47.343976
17	22	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Oil Change	41k mileage	3600.00	2026-07-07	41000	Veloz	2026-07-07 01:40:23.102905
18	23	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	created	\N	\N	\N	Other	Register Renewal	6500.00	2026-07-17	\N	Innova	2026-07-17 15:40:12.458721
19	24	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Repair	EGR CLEANING \nFUEL FILTER CHANGE	7000.00	2026-07-18	\N	Terra O	2026-07-18 02:55:46.778864
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, car_id, user_id, category, description, amount, mileage_at_expense, expense_date, created_at) FROM stdin;
1	7	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Oil Change	Test	0.10	20000	2026-01-05	2026-01-05 14:48:29.929526
2	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	Every 10KM	3800.00	36231	2025-11-29	2026-01-05 14:52:29.46068
3	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Oil Change	Maintenace for 80k Mileage	18350.00	\N	2026-01-11	2026-01-11 13:39:58.34365
4	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Tires	2nd hand tires	5000.00	\N	2026-02-12	2026-02-12 00:24:39.05178
5	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Tires	2 front tire brands new	6200.00	\N	2026-02-16	2026-02-16 14:26:58.581058
6	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Other	Battery	6900.00	\N	2026-01-11	2026-02-16 17:46:29.574954
8	2	dca48173-8e13-4cc4-94f8-bfeca4d6a5b8	Maintenance	Engine tune up - 500\nRubdown - 4000\nLabor - 800	4800.00	\N	2026-03-14	2026-03-13 18:14:55.125631
9	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	PMS	4500.00	\N	2026-03-16	2026-03-16 13:51:55.514058
10	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	PMS	4500.00	\N	2026-03-16	2026-03-16 13:52:18.612573
11	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Repair	FOG LIGHTS RUBDOWN	4800.00	\N	2026-03-16	2026-03-16 13:52:59.033093
14	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Repair	BREAK PADS ROTOR DISC	27000.00	\N	2026-04-30	2026-04-30 13:22:56.405507
15	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Oil Change	included on 27k payment, maintenance	0.01	\N	2026-04-30	2026-04-30 13:33:25.854758
16	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	5400 - Battery\n4800 - Electric Repair fuse\n3600 - Change oil	13800.00	90000	2026-05-15	2026-05-15 13:36:33.551083
17	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Oil Change	PMS 60k\nCHANGE OIL\nBREAKPADS\nFILTERS	10900.00	\N	2026-06-15	2026-06-15 13:40:22.087999
18	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Other	DASH CAM GPS	7000.00	\N	2026-06-24	2026-06-23 16:11:29.60014
19	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	Change battery	7000.00	\N	2026-07-03	2026-07-03 11:34:30.177408
20	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Maintenance	washer fluid hose	8000.00	\N	2026-07-03	2026-07-03 11:35:20.51931
21	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Repair	Change front film tint	1200.00	\N	2026-07-07	2026-07-07 01:39:47.263807
22	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Oil Change	41k mileage	3600.00	41000	2026-07-07	2026-07-07 01:40:22.961301
23	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Other	Register Renewal	6500.00	\N	2026-07-17	2026-07-17 15:40:12.363914
24	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Repair	EGR CLEANING \nFUEL FILTER CHANGE	7000.00	\N	2026-07-18	2026-07-18 02:55:46.698306
\.


--
-- Data for Name: monthly_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_payments (id, car_id, month, year, amount_due, amount_paid, is_paid, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: rental_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rental_logs (id, rental_id, car_id, user_id, action, field_name, old_value, new_value, customer_name, start_date, end_date, total_amount, car_name, logged_at) FROM stdin;
1	16	7	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	created	\N	\N	\N	TEst	2025-12-31	2026-01-12	133333.00	Fortuner	2026-01-05 14:41:20.53875
2	\N	7	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	TEst	2025-12-31	2026-01-12	133333.00	Fortuner	2026-01-05 14:41:59.197085
3	15	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	endDate	2026-01-31	2026-01-30	Queen Segunial	2026-01-01	2026-01-30	54000.00	Terra O	2026-01-05 14:42:45.47099
4	15	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	endDate	2026-01-30	2026-01-31	Queen Segunial	2026-01-01	2026-01-31	54000.00	Terra O	2026-01-05 14:43:11.350075
5	17	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jan Spain	2026-01-11	2026-02-10	54000.00	Terra N	2026-01-11 13:34:58.436773
6	18	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Julie europe	2026-01-09	2026-01-19	25000.00	Hilux	2026-01-11 13:38:33.323714
7	18	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Julie europe	2026-01-09	2026-01-19	25000.00	Hilux	2026-01-11 13:45:58.958167
8	17	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Jan Spain	2026-01-11	2026-02-10	54000.00	Terra N	2026-01-11 13:46:00.632905
9	19	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Camella Japan	2026-01-08	2026-01-28	32000.00	Veloz	2026-01-11 13:46:37.177262
10	\N	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	Jason Gray Indian	2026-01-01	2026-01-31	70000.00	Everest	2026-01-13 05:05:41.152544
11	19	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Camella Japan	2026-01-08	2026-01-28	32000.00	Veloz	2026-01-13 05:17:15.142193
12	20	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jason Bumbay	2026-01-01	2026-01-13	32500.00	Everest	2026-01-14 16:01:40.952968
13	20	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Jason Bumbay	2026-01-01	2026-01-13	32500.00	Everest	2026-01-14 16:05:10.512988
14	21	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Roan peddington	2026-01-14	2026-01-15	4000.00	Everest	2026-01-14 16:06:32.045471
15	21	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Roan peddington	2026-01-14	2026-01-15	4000.00	Everest	2026-01-14 16:10:20.658168
16	22	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Kyle muntinlupa	2026-01-10	2026-01-17	15000.00	MUX	2026-01-14 16:11:05.331841
17	23	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	BUMBAY	2026-01-06	2026-01-13	14000.00	GAC M6	2026-01-14 16:11:33.206882
18	23	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	BUMBAY	2026-01-06	2026-01-13	14000.00	GAC M6	2026-01-14 16:22:49.112309
19	22	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Kyle muntinlupa	2026-01-10	2026-01-17	15000.00	MUX	2026-01-14 16:22:50.852129
20	22	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-01-17	2026-01-15	Kyle muntinlupa	2026-01-10	2026-01-15	10000.00	MUX	2026-01-15 15:08:40.066713
21	22	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	15000.00	10000	Kyle muntinlupa	2026-01-10	2026-01-15	10000.00	MUX	2026-01-15 15:08:40.108915
22	24	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Dubai Bacoor renter 	2026-01-21	2026-01-24	7500.00	Hilux	2026-01-22 17:09:53.030061
23	25	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Europe Renter	2026-01-22	2026-01-25	9000.00	MUX	2026-01-22 17:10:46.564113
24	26	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Spain renter	2026-01-21	2026-02-10	40000.00	Everest	2026-01-22 17:12:15.000012
25	26	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Spain renter	2026-01-21	2026-02-10	40000.00	Everest	2026-01-22 17:12:45.181489
26	25	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Europe Renter	2026-01-22	2026-01-25	9000.00	MUX	2026-01-22 17:12:46.786365
27	24	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Dubai Bacoor renter 	2026-01-21	2026-01-24	7500.00	Hilux	2026-01-22 17:12:48.134394
28	27	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Bacolod renter Ken paroginog	2026-01-24	2026-01-27	7500.00	GAC M6	2026-01-22 17:14:26.10301
29	28	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Return client	2026-01-24	2026-01-25	3000.00	Innova	2026-01-22 17:15:42.15335
30	28	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Return client	2026-01-24	2026-01-25	3000.00	Innova	2026-01-23 04:54:12.69296
31	27	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Bacolod renter Ken paroginog	2026-01-24	2026-01-27	7500.00	GAC M6	2026-01-23 04:54:14.441333
32	29	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Verdant renter	2026-01-31	2026-02-01	3000.00	Hilux	2026-02-06 14:09:13.454657
33	30	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Verdant renter	2026-02-02	2026-02-03	3000.00	MUX	2026-02-06 14:09:57.948619
34	30	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Verdant renter	2026-02-02	2026-02-03	3000.00	MUX	2026-02-07 06:14:30.530006
35	29	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Verdant renter	2026-01-31	2026-02-01	3000.00	Hilux	2026-02-07 06:14:31.946226
36	31	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Cathy bacoor	2026-01-29	2026-02-10	21600.00	Veloz	2026-02-09 14:57:57.12491
37	32	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Moonwalk	2026-02-07	2026-02-08	3000.00	MUX	2026-02-09 14:58:36.129137
38	32	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	isFinalized	false	true	Moonwalk	2026-02-07	2026-02-08	3000.00	MUX	2026-02-10 14:39:18.747635
39	31	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	isFinalized	false	true	Cathy bacoor	2026-01-29	2026-02-10	21600.00	Veloz	2026-02-10 14:39:21.136106
40	33	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Dr.Caballero	2026-02-12	2026-02-16	14000.00	Everest	2026-02-12 00:20:41.850812
41	33	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Dr.Caballero	2026-02-12	2026-02-16	14000.00	Everest	2026-02-12 01:45:14.645447
42	34	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Queen Segunial	2026-02-01	2026-03-02	54000.00	Terra O	2026-02-12 01:46:35.062629
43	35	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	YUPIO NAIA	2026-02-14	2026-02-27	26000.00	Terra N	2026-02-12 01:47:37.765352
44	35	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	YUPIO NAIA	2026-02-14	2026-02-27	26000.00	Terra N	2026-02-13 12:23:17.519521
45	34	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Queen Segunial	2026-02-01	2026-03-02	54000.00	Terra O	2026-02-13 12:23:19.554914
46	36	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Sir glenn pulis	2026-01-28	2026-02-04	14000.00	GAC M6	2026-02-13 12:29:55.175226
47	37	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Krisha US	2026-02-12	2026-02-15	9000.00	Veloz	2026-02-13 12:34:12.041235
48	38	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Sir Glenn pulis	2026-02-05	2026-03-07	42000.00	GAC M6	2026-02-13 12:35:29.789565
49	39	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Patrick Dacanay Cainta	2026-02-16	2026-02-20	10000.00	MUX	2026-02-13 12:36:32.535727
50	39	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Patrick Dacanay Cainta	2026-02-16	2026-02-20	10000.00	MUX	2026-02-13 12:38:42.693546
51	38	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Sir Glenn pulis	2026-02-05	2026-03-07	42000.00	GAC M6	2026-02-13 12:38:43.767773
52	37	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Krisha US	2026-02-12	2026-02-15	9000.00	Veloz	2026-02-13 12:38:45.314012
53	36	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Sir glenn pulis	2026-01-28	2026-02-04	14000.00	GAC M6	2026-02-13 12:38:46.925384
54	40	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Hepe Renter company	2026-02-16	2026-03-18	32000.00	Innova	2026-02-13 12:39:18.904101
55	41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Michael Sargento US client(moimoi)	2026-03-24	2026-04-30	55000.00	Veloz	2026-02-13 13:21:47.506698
56	40	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Hepe Renter company	2026-02-16	2026-03-18	32000.00	Innova	2026-02-13 13:23:56.378747
57	41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Michael Sargento US client(moimoi)	2026-03-24	2026-04-30	55000.00	Veloz	2026-02-13 13:23:58.26202
58	42	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Vett Muntinlupa	2026-02-17	2026-02-26	7000.00	Everest	2026-02-17 14:35:49.210992
59	42	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Vett Muntinlupa	2026-02-17	2026-02-26	7000.00	Everest	2026-02-17 14:36:48.995274
60	42	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-02-26	2026-02-19	Vett Muntinlupa	2026-02-17	2026-02-19	7000.00	Everest	2026-02-17 14:37:37.985112
61	43	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	US client 	2026-02-17	2026-02-20	9000.00	Veloz	2026-02-17 14:40:09.918814
62	43	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	US client 	2026-02-17	2026-02-20	9000.00	Veloz	2026-02-17 14:44:01.952939
63	44	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Donnie US	2026-02-22	2026-03-01	24500.00	Everest	2026-02-17 14:45:11.997258
64	44	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Donnie US	2026-02-22	2026-03-01	24500.00	Everest	2026-02-17 14:49:10.737408
65	45	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jan rafada	2026-02-25	2026-02-28	7500.00	MUX	2026-02-25 04:46:00.127243
66	45	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Jan rafada	2026-02-25	2026-02-28	7500.00	MUX	2026-03-03 12:09:37.899749
67	46	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jerome UK	2026-03-01	2026-03-08	14000.00	Terra N	2026-03-03 12:11:23.612387
68	47	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Diaz Pangasinan bacoor	2026-03-01	2026-04-20	75000.00	Hilux	2026-03-03 12:12:28.700959
69	48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Art US	2026-03-14	2026-04-20	75000.00	MUX	2026-03-03 12:53:19.395015
70	49	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Amero apple US	2026-04-22	2026-05-22	45000.00	Hilux	2026-03-03 13:12:38.731721
71	49	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Amero apple US	2026-04-22	2026-05-22	45000.00	Hilux	2026-03-03 13:44:54.246701
72	48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Art US	2026-03-14	2026-04-20	75000.00	MUX	2026-03-03 13:44:55.734417
73	47	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Diaz Pangasinan bacoor	2026-03-01	2026-04-20	75000.00	Hilux	2026-03-03 13:44:57.430107
74	46	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Jerome UK	2026-03-01	2026-03-08	14000.00	Terra N	2026-03-03 13:44:58.963222
75	50	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Canada 	2026-03-07	2026-03-10	9000.00	Veloz	2026-03-07 01:27:41.420216
76	51	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	ms. boloto	2026-03-07	2026-03-08	2500.00	MUX	2026-03-07 01:28:07.375036
77	52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-03-05	2026-03-10	15000.00	Everest	2026-03-07 01:29:10.676188
78	52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Erlord norway	2026-03-05	2026-03-10	15000.00	Everest	2026-03-07 01:33:04.441859
79	51	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	ms. boloto	2026-03-07	2026-03-08	2500.00	MUX	2026-03-07 01:33:05.939343
80	50	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Canada 	2026-03-07	2026-03-10	9000.00	Veloz	2026-03-07 01:33:07.394256
81	53	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Sugar Pasig renter	2026-03-13	2026-04-12	50000.00	Terra N	2026-03-10 01:57:16.93901
82	52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-03-10	2026-03-12	Erlord norway	2026-03-05	2026-03-12	20000.00	Everest	2026-03-10 01:57:45.181676
83	52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	15000.00	20000	Erlord norway	2026-03-05	2026-03-12	20000.00	Everest	2026-03-10 01:57:45.211692
84	54	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Queen Segunial Laguna	2026-03-06	2026-04-05	54000.00	Terra O	2026-03-10 02:13:07.797979
85	54	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Queen Segunial Laguna	2026-03-06	2026-04-05	54000.00	Terra O	2026-03-10 03:34:42.827674
86	53	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Sugar Pasig renter	2026-03-13	2026-04-12	50000.00	Terra N	2026-03-10 03:34:44.69219
87	55	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Canadian	2026-03-13	2026-03-14	2500.00	Veloz	2026-03-13 23:25:06.179
88	56	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jherbie Pato pasig	2026-03-13	2026-03-20	21000.00	Everest	2026-03-13 23:25:36.162501
89	57	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Canadian	2026-03-19	2026-03-22	7500.00	Veloz	2026-03-13 23:26:19.923483
90	57	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Canadian	2026-03-19	2026-03-22	7500.00	Veloz	2026-03-13 23:27:11.911226
91	56	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Jherbie Pato pasig	2026-03-13	2026-03-20	21000.00	Everest	2026-03-13 23:27:13.632048
92	55	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Canadian	2026-03-13	2026-03-14	2500.00	Veloz	2026-03-13 23:27:15.237231
93	48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	75000.00	0	Art US	2026-03-14	2026-04-20	0.00	MUX	2026-03-14 00:35:34.24349
94	48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-04-20	2026-04-13	Art US	2026-03-14	2026-04-13	45000.00	MUX	2026-03-14 08:32:08.659521
95	48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	0.00	45000	Art US	2026-03-14	2026-04-13	45000.00	MUX	2026-03-14 08:32:08.710498
96	58	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Hepe renter	2026-03-19	2026-04-18	32000.00	Innova	2026-03-14 08:34:06.460528
97	59	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Muntinlupa	2026-03-13	2026-03-14	3000.00	GAC M6	2026-03-14 08:34:47.111282
98	58	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Hepe renter	2026-03-19	2026-04-18	32000.00	Innova	2026-03-14 12:48:12.869958
99	59	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Muntinlupa	2026-03-13	2026-03-14	3000.00	GAC M6	2026-03-14 12:48:13.835834
100	41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	startDate	2026-03-24	2026-03-26	Michael Sargento US client(moimoi)	2026-03-26	2026-04-30	52000.00	Veloz	2026-03-15 06:01:14.738667
101	41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	55000.00	52000	Michael Sargento US client(moimoi)	2026-03-26	2026-04-30	52000.00	Veloz	2026-03-15 06:01:14.785526
102	52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	20000.00	21000.00	Erlord norway	2026-03-05	2026-03-12	21000.00	Everest	2026-03-15 06:24:32.569524
103	59	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-03-14	2026-03-15	Muntinlupa	2026-03-13	2026-03-15	5500.00	GAC M6	2026-03-15 06:24:56.441065
104	59	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	3000.00	5500	Muntinlupa	2026-03-13	2026-03-15	5500.00	GAC M6	2026-03-15 06:24:56.476647
105	57	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	startDate	2026-03-19	2026-03-20	Canadian	2026-03-20	2026-03-22	6000.00	Veloz	2026-03-15 06:25:21.805864
106	57	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	7500.00	6000	Canadian	2026-03-20	2026-03-22	6000.00	Veloz	2026-03-15 06:25:21.83956
107	60	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Castro CEO	2026-03-30	2026-04-06	21000.00	Everest	2026-04-02 15:08:49.829187
108	61	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Gwen pasay	2026-04-01	2026-04-04	9000.00	GAC M6	2026-04-02 15:09:28.004759
109	61	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Gwen pasay	2026-04-01	2026-04-04	9000.00	GAC M6	2026-04-05 12:45:01.120327
110	60	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Castro CEO	2026-03-30	2026-04-06	21000.00	Everest	2026-04-05 12:45:02.984206
111	62	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	CEO ONYX pampanga	2026-04-07	2026-04-13	17500.00	Everest	2026-04-08 04:12:42.862091
112	63	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Gemil Pasay	2026-04-14	2026-04-21	17500.00	Terra N	2026-04-08 04:13:29.693568
113	63	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Gemil Pasay	2026-04-14	2026-04-21	17500.00	Terra N	2026-04-18 00:43:28.344061
114	62	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	CEO ONYX pampanga	2026-04-07	2026-04-13	17500.00	Everest	2026-04-18 00:43:30.102996
115	64	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Queen Segunial	2026-04-06	2026-05-05	50000.00	Terra O	2026-04-18 00:44:51.014087
116	65	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	CEO pampanga	2026-04-14	2026-04-20	17500.00	Everest	2026-04-18 00:46:19.860351
117	66	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Mark Denniz Guzman	2026-04-21	2026-05-01	17000.00	MUX	2026-04-18 00:55:11.296664
118	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-04-18 01:14:51.670177
119	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-04-20 08:30:46.767452
120	66	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Mark Denniz Guzman	2026-04-21	2026-05-01	17000.00	MUX	2026-04-20 08:30:48.591416
121	65	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	CEO pampanga	2026-04-14	2026-04-20	17500.00	Everest	2026-04-20 08:30:50.73746
122	64	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Queen Segunial	2026-04-06	2026-05-05	50000.00	Terra O	2026-04-20 08:30:52.463123
123	68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	CEO pampanga	2026-04-21	2026-04-27	125000.00	Everest	2026-04-20 08:31:58.179744
124	68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	125000.00	12500.00	CEO pampanga	2026-04-21	2026-04-27	12500.00	Everest	2026-04-20 08:32:25.941698
125	68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	CEO pampanga	2026-04-21	2026-04-27	12500.00	Everest	2026-04-20 08:36:00.652627
126	69	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	RJ brother	2026-05-02	2026-05-04	6000.00	MUX	2026-04-28 21:18:55.420759
127	68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-04-27	2026-05-04	CEO pampanga	2026-04-21	2026-05-04	35000.00	Everest	2026-04-28 21:20:33.493908
128	68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	12500.00	35000	CEO pampanga	2026-04-21	2026-05-04	35000.00	Everest	2026-04-28 21:20:33.525047
129	69	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	RJ brother	2026-05-02	2026-05-04	6000.00	MUX	2026-04-28 21:21:54.060491
130	70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Mariles Quilas Return client 	2026-04-30	2026-05-15	30000.00	Terra N	2026-04-28 21:23:53.352313
131	70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Mariles Quilas Return client 	2026-04-30	2026-05-15	30000.00	Terra N	2026-04-28 21:26:57.668093
132	71	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Earl Manrique Return client	2026-05-07	2026-05-14	14000.00	Veloz	2026-04-28 23:02:46.317516
133	71	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Earl Manrique Return client	2026-05-07	2026-05-14	14000.00	Veloz	2026-04-29 00:19:59.283997
134	41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-04-30	2026-05-02	Michael Sargento US client(moimoi)	2026-03-26	2026-05-02	52000.00	Veloz	2026-04-30 05:06:27.77063
135	64	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-05	2026-06-05	Queen Segunial	2026-04-06	2026-06-05	100000.00	Terra O	2026-04-30 05:11:09.349245
136	64	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	50000.00	100000	Queen Segunial	2026-04-06	2026-06-05	100000.00	Terra O	2026-04-30 05:11:09.393013
137	71	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	paymentStatus	pending	confirmed	Earl Manrique Return client	2026-05-07	2026-05-14	14000.00	Veloz	2026-04-30 05:11:14.406392
138	70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	paymentStatus	pending	confirmed	Mariles Quilas Return client 	2026-04-30	2026-05-15	30000.00	Terra N	2026-04-30 05:11:16.341768
139	69	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	paymentStatus	pending	confirmed	RJ brother	2026-05-02	2026-05-04	6000.00	MUX	2026-04-30 05:11:18.22195
140	72	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Hepe renter	2026-04-18	2026-05-18	38000.00	GAC M6	2026-04-30 05:20:49.866854
141	72	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	paymentStatus	pending	confirmed	Hepe renter	2026-04-18	2026-05-18	38000.00	GAC M6	2026-04-30 05:20:57.490694
142	72	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Hepe renter	2026-04-18	2026-05-18	38000.00	GAC M6	2026-04-30 05:33:50.670745
143	73	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-04-30 11:50:00.297021
144	73	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	isFinalized	false	true	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-04-30 12:11:28.856862
145	70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-15	2026-05-12	Mariles Quilas Return client 	2026-04-30	2026-05-12	26400.00	Terra N	2026-04-30 13:03:24.718741
146	70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	30000.00	26400	Mariles Quilas Return client 	2026-04-30	2026-05-12	26400.00	Terra N	2026-04-30 13:03:24.762349
147	73	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	paymentStatus	pending	confirmed	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-04-30 13:03:55.843811
148	73	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	confirmed	pending	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-04-30 17:03:12.676329
149	67	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	confirmed	pending	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-04-30 17:03:53.362658
150	73	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-05-05 13:53:28.013244
151	73	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-05	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-05-05 13:53:28.042745
152	73	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-05-05 13:53:28.067041
153	67	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-05-05 13:59:24.826366
154	67	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-05	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-05-05 13:59:24.851467
155	67	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Hepe Renter company	2026-04-19	2026-05-18	32000.00	Innova	2026-05-05 13:59:24.875777
156	73	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	customerPhone		09171234567	Australia Renter	2026-05-23	2026-06-08	32000.00	Terra N	2026-05-05 14:02:07.411094
160	75	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	X	2026-09-01	2026-09-02	500.00	Terra N	2026-05-05 14:06:24.58494
161	76	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	X	2026-09-03	2026-09-04	500.00	Terra N	2026-05-05 14:06:24.823417
172	\N	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	deleted	\N	\N	\N	RJ brother	2026-05-02	2026-05-04	6000.00	MUX	2026-05-08 15:50:17.916639
173	80	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	RJ brother	2026-05-03	2026-05-04	6000.00	Veloz	2026-05-08 23:08:35.025278
174	81	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Geologo	2026-05-04	2026-05-08	7500.00	MUX	2026-05-08 23:09:21.59876
175	82	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Innova	2026-05-08 23:11:24.625729
176	83	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jerico Antipolo return client	2026-05-16	2026-05-18	6000.00	Terra N	2026-05-08 23:24:02.110709
177	80	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	RJ brother	2026-05-03	2026-05-04	6000.00	Veloz	2026-05-11 17:58:51.267597
178	80	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-12	RJ brother	2026-05-03	2026-05-04	6000.00	Veloz	2026-05-11 17:58:51.310147
179	80	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pachu	RJ brother	2026-05-03	2026-05-04	6000.00	Veloz	2026-05-11 17:58:51.340567
180	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Ellen bulacan	2026-05-10	2026-05-17	19999.97	Everest	2026-05-12 05:51:38.89446
181	85	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Gia bambao	2026-05-12	2026-05-14	5000.00	MUX	2026-05-12 05:52:23.476699
182	86	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Taguig Renter 	2026-05-16	2026-05-18	6000.00	Veloz	2026-05-15 06:29:41.748721
183	87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	John kyle Return client	2026-05-13	2026-05-15	11000.00	Terra N	2026-05-15 06:30:57.495509
184	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-17	2026-05-18	Ellen bulacan	2026-05-10	2026-05-18	23000.00	Everest	2026-05-15 06:31:39.888667
185	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	19999.97	23000	Ellen bulacan	2026-05-10	2026-05-18	23000.00	Everest	2026-05-15 06:31:39.918258
186	\N	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	deleted	\N	\N	\N	Jerico Antipolo return client	2026-05-16	2026-05-18	6000.00	Terra N	2026-05-15 12:48:41.253492
187	87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-15	2026-05-17	John kyle Return client	2026-05-13	2026-05-17	13000.00	Terra N	2026-05-15 12:49:27.902708
188	87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	11000.00	13000	John kyle Return client	2026-05-13	2026-05-17	13000.00	Terra N	2026-05-15 12:49:27.934478
189	88	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Muntinlupa Renter	2026-05-16	2026-05-17	3500.00	MUX	2026-05-15 12:50:09.916033
190	87	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	John kyle Return client	2026-05-13	2026-05-17	13000.00	Terra N	2026-05-18 15:08:45.012289
191	87	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-18	John kyle Return client	2026-05-13	2026-05-17	13000.00	Terra N	2026-05-18 15:08:45.060334
192	87	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	John kyle Return client	2026-05-13	2026-05-17	13000.00	Terra N	2026-05-18 15:08:45.0933
193	86	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Taguig Renter 	2026-05-16	2026-05-18	6000.00	Veloz	2026-05-18 15:09:05.997476
194	86	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-18	Taguig Renter 	2026-05-16	2026-05-18	6000.00	Veloz	2026-05-18 15:09:06.030399
195	86	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Taguig Renter 	2026-05-16	2026-05-18	6000.00	Veloz	2026-05-18 15:09:06.063428
196	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-18	2026-05-20	Ellen bulacan	2026-05-10	2026-05-20	29000.00	Everest	2026-05-19 06:21:34.914864
197	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	23000.00	29000.00	Ellen bulacan	2026-05-10	2026-05-20	29000.00	Everest	2026-05-19 06:21:34.958801
198	87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-17	2026-05-19	John kyle Return client	2026-05-13	2026-05-19	18000.00	Terra N	2026-05-19 06:22:00.593663
199	87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	13000.00	18000.00	John kyle Return client	2026-05-13	2026-05-19	18000.00	Terra N	2026-05-19 06:22:00.625873
200	89	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Jan rafada	2026-05-24	2026-05-27	9000.00	MUX	2026-05-19 06:33:51.427844
201	81	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Geologo	2026-05-04	2026-05-08	7500.00	MUX	2026-05-19 13:46:19.503543
202	81	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-19	Geologo	2026-05-04	2026-05-08	7500.00	MUX	2026-05-19 13:46:19.546108
203	81	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Geologo	2026-05-04	2026-05-08	7500.00	MUX	2026-05-19 13:46:19.579426
204	85	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Gia bambao	2026-05-12	2026-05-14	5000.00	MUX	2026-05-19 13:50:01.189374
205	85	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-19	Gia bambao	2026-05-12	2026-05-14	5000.00	MUX	2026-05-19 13:50:01.235409
206	85	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		gCash	Gia bambao	2026-05-12	2026-05-14	5000.00	MUX	2026-05-19 13:50:01.268232
207	88	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Muntinlupa Renter	2026-05-16	2026-05-17	3500.00	MUX	2026-05-19 13:50:11.759169
208	88	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-19	Muntinlupa Renter	2026-05-16	2026-05-17	3500.00	MUX	2026-05-19 13:50:11.792251
209	88	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		cash	Muntinlupa Renter	2026-05-16	2026-05-17	3500.00	MUX	2026-05-19 13:50:11.825662
210	\N	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	deleted	\N	\N	\N	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Innova	2026-05-20 03:57:27.871106
211	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-18	2026-06-18	Hepe Renter company	2026-04-19	2026-06-18	64000.00	Innova	2026-05-20 03:58:59.389566
212	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	32000.00	64000	Hepe Renter company	2026-04-19	2026-06-18	64000.00	Innova	2026-05-20 03:58:59.421383
213	84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	29000.00	26000.00	Ellen bulacan	2026-05-10	2026-05-20	26000.00	Everest	2026-05-20 14:22:21.57018
214	90	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Kyla pasay	2026-05-21	2026-05-22	4000.00	Veloz	2026-05-20 14:22:59.262559
215	84	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Ellen bulacan	2026-05-10	2026-05-20	26000.00	Everest	2026-05-21 13:29:50.508068
216	84	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-21	Ellen bulacan	2026-05-10	2026-05-20	26000.00	Everest	2026-05-21 13:29:50.54935
217	84	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Ellen bulacan	2026-05-10	2026-05-20	26000.00	Everest	2026-05-21 13:29:50.582821
218	90	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Kyla pasay	2026-05-21	2026-05-22	4000.00	Veloz	2026-05-21 13:30:11.738642
219	90	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-21	Kyla pasay	2026-05-21	2026-05-22	4000.00	Veloz	2026-05-21 13:30:11.771993
220	90	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Kyla pasay	2026-05-21	2026-05-22	4000.00	Veloz	2026-05-21 13:30:11.805106
221	91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Kyle Muntilupa	2026-05-23	2026-05-24	5000.00	Hilux	2026-05-23 02:49:24.238868
222	92	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Christine Taguig	2026-05-22	2026-05-24	7000.00	Everest	2026-05-23 02:49:57.758883
223	93	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Leo	2026-05-23	2026-05-24	4000.00	Veloz	2026-05-23 02:50:21.554331
224	94	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Johannes UST	2026-05-25	2026-05-27	7000.00	Everest	2026-05-23 02:51:23.237117
225	95	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Veloz	2026-05-23 02:58:35.846531
226	92	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Christine Taguig	2026-05-22	2026-05-24	7000.00	Everest	2026-05-24 03:42:53.241075
227	92	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-24	Christine Taguig	2026-05-22	2026-05-24	7000.00	Everest	2026-05-24 03:42:53.280777
228	92	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Christine Taguig	2026-05-22	2026-05-24	7000.00	Everest	2026-05-24 03:42:53.311338
229	93	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Leo	2026-05-23	2026-05-24	4000.00	Veloz	2026-05-24 03:43:11.988691
230	93	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-24	Leo	2026-05-23	2026-05-24	4000.00	Veloz	2026-05-24 03:43:12.018994
231	93	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Leo	2026-05-23	2026-05-24	4000.00	Veloz	2026-05-24 03:43:12.050816
232	89	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	9000.00	7500	Jan rafada	2026-05-24	2026-05-27	7500.00	MUX	2026-05-24 03:49:02.139983
233	89	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	notes		Change destination 2500 per day	Jan rafada	2026-05-24	2026-05-27	7500.00	MUX	2026-05-24 03:49:02.171009
234	91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	5000.00	14000	Kyle Muntilupa	2026-05-23	2026-05-24	14000.00	Hilux	2026-05-27 13:40:08.709738
235	91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-24	2026-05-28	Kyle Muntilupa	2026-05-23	2026-05-28	14000.00	Hilux	2026-05-27 13:40:21.557924
236	96	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Ivy Laurice IMUS	2026-06-16	2026-07-02	32000.00	Terra N	2026-05-27 13:45:21.44903
237	97	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Renz arroyo QC	2026-06-19	2026-08-10	114000.00	Everest	2026-05-27 13:48:56.635105
238	95	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Veloz	2026-05-29 15:14:48.47905
239	95	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-29	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Veloz	2026-05-29 15:14:48.521816
240	95	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Mark dumaraos	2026-05-29	2026-06-07	18000.00	Veloz	2026-05-29 15:14:48.554338
241	94	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Johannes UST	2026-05-25	2026-05-27	7000.00	Everest	2026-05-29 16:44:45.937275
242	94	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-30	Johannes UST	2026-05-25	2026-05-27	7000.00	Everest	2026-05-29 16:44:45.982837
243	94	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Johannes UST	2026-05-25	2026-05-27	7000.00	Everest	2026-05-29 16:44:46.016255
244	89	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Jan rafada	2026-05-24	2026-05-27	7500.00	MUX	2026-05-29 16:45:21.590408
245	89	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-05-30	Jan rafada	2026-05-24	2026-05-27	7500.00	MUX	2026-05-29 16:45:21.623271
246	89	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Jan rafada	2026-05-24	2026-05-27	7500.00	MUX	2026-05-29 16:45:21.656002
247	98	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Matt SJBM	2026-05-30	2026-05-31	4000.00	MUX	2026-06-01 03:32:47.331454
248	99	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erold	2026-05-31	2026-06-02	5000.00	MUX	2026-06-01 03:33:18.378353
249	100	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Chrisjunmar Butuan	2026-05-31	2026-06-03	10499.97	Everest	2026-06-01 03:34:41.656222
250	91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	14000.00	17000	Kyle Muntilupa	2026-05-23	2026-05-28	17000.00	Hilux	2026-06-01 03:44:29.032882
251	91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-05-28	2026-05-30	Kyle Muntilupa	2026-05-23	2026-05-30	17000.00	Hilux	2026-06-01 03:45:04.63864
252	91	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Kyle Muntilupa	2026-05-23	2026-05-30	17000.00	Hilux	2026-06-02 14:37:47.892323
253	91	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-02	Kyle Muntilupa	2026-05-23	2026-05-30	17000.00	Hilux	2026-06-02 14:37:47.931646
254	91	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Kyle Muntilupa	2026-05-23	2026-05-30	17000.00	Hilux	2026-06-02 14:37:47.962043
255	100	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Chrisjunmar Butuan	2026-05-31	2026-06-03	10499.97	Everest	2026-06-02 15:00:30.869276
256	100	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-02	Chrisjunmar Butuan	2026-05-31	2026-06-03	10499.97	Everest	2026-06-02 15:00:30.906989
257	100	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Chrisjunmar Butuan	2026-05-31	2026-06-03	10499.97	Everest	2026-06-02 15:00:30.93886
258	99	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-02	2026-06-03	Erold	2026-05-31	2026-06-03	7500.00	MUX	2026-06-03 12:57:56.224721
259	99	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	5000.00	7500	Erold	2026-05-31	2026-06-03	7500.00	MUX	2026-06-03 12:57:56.265333
260	101	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	ErLord	2026-06-04	2026-06-06	7500.00	Everest	2026-06-03 12:58:49.76894
261	101	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	startDate	2026-06-04	2026-06-03	ErLord	2026-06-03	2026-06-06	7500.00	Everest	2026-06-03 12:59:12.625485
262	98	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Matt SJBM	2026-05-30	2026-05-31	4000.00	MUX	2026-06-03 15:20:19.08316
263	98	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-03	Matt SJBM	2026-05-30	2026-05-31	4000.00	MUX	2026-06-03 15:20:19.123025
264	98	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Matt SJBM	2026-05-30	2026-05-31	4000.00	MUX	2026-06-03 15:20:19.154486
265	99	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erold	2026-05-31	2026-06-03	7500.00	MUX	2026-06-03 15:23:05.13188
266	99	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-03	Erold	2026-05-31	2026-06-03	7500.00	MUX	2026-06-03 15:23:05.172966
267	99	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Erold	2026-05-31	2026-06-03	7500.00	MUX	2026-06-03 15:23:05.205544
268	101	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	ErLord	2026-06-03	2026-06-06	7500.00	Everest	2026-06-03 15:23:34.27896
269	101	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-03	ErLord	2026-06-03	2026-06-06	7500.00	Everest	2026-06-03 15:23:34.311739
270	101	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	ErLord	2026-06-03	2026-06-06	7500.00	Everest	2026-06-03 15:23:34.34377
271	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-18	2026-05-16	Hepe Renter company	2026-04-19	2026-05-16	32000.00	Innova	2026-06-04 04:07:22.206994
272	67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	64000.00	32000	Hepe Renter company	2026-04-19	2026-05-16	32000.00	Innova	2026-06-04 04:07:22.252318
273	102	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Hepe Renter company	2026-05-17	2026-06-01	1.00	Innova	2026-06-04 04:08:13.793936
274	103	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Atan QC	2026-06-05	2026-06-08	7500.00	Innova	2026-06-04 12:07:04.645405
275	103	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Atan QC	2026-06-05	2026-06-08	7500.00	Innova	2026-06-05 16:59:21.672202
276	103	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-06	Atan QC	2026-06-05	2026-06-08	7500.00	Innova	2026-06-05 16:59:21.716199
277	103	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Atan QC	2026-06-05	2026-06-08	7500.00	Innova	2026-06-05 16:59:21.751392
278	97	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	startDate	2026-06-19	2026-06-18	Renz arroyo QC	2026-06-18	2026-08-10	121000.00	Everest	2026-06-06 01:12:14.505239
279	97	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	114000.00	121000	Renz arroyo QC	2026-06-18	2026-08-10	121000.00	Everest	2026-06-06 01:12:14.54792
280	104	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	JONA PASIG	2026-06-05	2026-06-07	8000.00	EVEREST BLUE	2026-06-06 01:15:11.289102
281	105	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Kyle Muntilupa	2026-05-30	2026-06-06	12600.00	Hilux	2026-06-06 02:26:08.067634
282	105	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-06	2026-06-08	Kyle Muntilupa	2026-05-30	2026-06-08	16200.00	Hilux	2026-06-06 13:52:28.721946
283	105	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	12600.00	16200	Kyle Muntilupa	2026-05-30	2026-06-08	16200.00	Hilux	2026-06-06 13:52:28.768424
284	106	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Chris LP	2026-06-06	2026-06-07	1800.00	MUX	2026-06-07 05:42:50.727582
285	107	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Phoenix Las pinas 	2026-06-09	2026-06-10	4500.00	Hilux	2026-06-07 05:45:17.910561
286	107	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	notes		1 day and 12hrs	Phoenix Las pinas 	2026-06-09	2026-06-10	4500.00	Hilux	2026-06-07 05:45:36.445074
287	108	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Fernan old client	2026-06-12	2026-06-13	4000.00	Veloz	2026-06-07 06:01:25.851503
288	109	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-06-06	2026-06-08	6000.00	Everest	2026-06-07 15:30:58.121097
289	109	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-08	2026-06-09	Erlord norway	2026-06-06	2026-06-09	8500.00	Everest	2026-06-08 01:33:41.05912
290	109	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	6000.00	8500	Erlord norway	2026-06-06	2026-06-09	8500.00	Everest	2026-06-08 01:33:41.097132
291	106	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Chris LP	2026-06-06	2026-06-07	1800.00	MUX	2026-06-08 16:44:03.853115
292	106	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-09	Chris LP	2026-06-06	2026-06-07	1800.00	MUX	2026-06-08 16:44:03.892605
293	106	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Chris LP	2026-06-06	2026-06-07	1800.00	MUX	2026-06-08 16:44:03.923102
294	104	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	JONA PASIG	2026-06-05	2026-06-07	8000.00	EVEREST BLUE	2026-06-08 16:44:23.052437
295	104	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-09	JONA PASIG	2026-06-05	2026-06-07	8000.00	EVEREST BLUE	2026-06-08 16:44:23.083846
296	104	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	JONA PASIG	2026-06-05	2026-06-07	8000.00	EVEREST BLUE	2026-06-08 16:44:23.1146
297	110	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-06-11	2026-06-21	25000.00	Everest	2026-06-09 03:45:41.380651
298	111	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Joselito Cheng	2026-06-13	2026-06-15	5000.00	Hilux	2026-06-09 03:47:54.830157
299	109	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-06-06	2026-06-09	8500.00	Everest	2026-06-09 13:31:15.468372
300	109	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-09	Erlord norway	2026-06-06	2026-06-09	8500.00	Everest	2026-06-09 13:31:15.510452
301	109	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Erlord norway	2026-06-06	2026-06-09	8500.00	Everest	2026-06-09 13:31:15.541638
302	107	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Phoenix Las pinas 	2026-06-09	2026-06-10	4500.00	Hilux	2026-06-09 13:32:06.719713
303	107	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-09	Phoenix Las pinas 	2026-06-09	2026-06-10	4500.00	Hilux	2026-06-09 13:32:06.755877
304	107	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Phoenix Las pinas 	2026-06-09	2026-06-10	4500.00	Hilux	2026-06-09 13:32:06.786482
305	105	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Kyle Muntilupa	2026-05-30	2026-06-08	16200.00	Hilux	2026-06-09 14:52:31.526308
306	105	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-09	Kyle Muntilupa	2026-05-30	2026-06-08	16200.00	Hilux	2026-06-09 14:52:31.570299
307	105	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Kyle Muntilupa	2026-05-30	2026-06-08	16200.00	Hilux	2026-06-09 14:52:31.604264
308	112	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Ethan Sroka	2026-06-11	2026-06-18	19600.00	EVEREST BLUE	2026-06-11 01:19:24.514598
309	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	John kyle Return client	2026-06-10	2026-06-17	12600.00	Innova	2026-06-11 01:20:37.695524
310	110	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-06-11	2026-06-21	25000.00	Everest	2026-06-11 13:53:42.262252
311	110	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-11	Erlord norway	2026-06-11	2026-06-21	25000.00	Everest	2026-06-11 13:53:42.30097
312	110	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Erlord norway	2026-06-11	2026-06-21	25000.00	Everest	2026-06-11 13:53:42.332368
313	112	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Ethan Sroka	2026-06-11	2026-06-18	19600.00	EVEREST BLUE	2026-06-11 13:53:50.632712
314	112	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-11	Ethan Sroka	2026-06-11	2026-06-18	19600.00	EVEREST BLUE	2026-06-11 13:53:50.663469
315	112	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Ethan Sroka	2026-06-11	2026-06-18	19600.00	EVEREST BLUE	2026-06-11 13:53:50.694469
316	102	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Hepe Renter company	2026-05-17	2026-06-01	1.00	Innova	2026-06-11 13:56:51.074007
317	102	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-11	Hepe Renter company	2026-05-17	2026-06-01	1.00	Innova	2026-06-11 13:56:51.105101
318	102	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Hepe Renter company	2026-05-17	2026-06-01	1.00	Innova	2026-06-11 13:56:51.136446
319	114	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Queen Segunial Laguna	2026-06-09	2026-07-05	50000.00	Terra N	2026-06-12 13:52:37.260128
320	114	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	notes	6 months contract	6 months contract\n30 days \nStart JUNE 5 to JULY 5 2026	Queen Segunial Laguna	2026-06-09	2026-07-05	50000.00	Terra N	2026-06-12 13:53:06.459573
321	114	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Queen Segunial Laguna	2026-06-09	2026-07-05	50000.00	Terra N	2026-06-13 05:30:12.62725
322	114	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-13	Queen Segunial Laguna	2026-06-09	2026-07-05	50000.00	Terra N	2026-06-13 05:30:12.665472
323	114	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Queen Segunial Laguna	2026-06-09	2026-07-05	50000.00	Terra N	2026-06-13 05:30:12.695852
324	108	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Fernan old client	2026-06-12	2026-06-13	4000.00	Veloz	2026-06-13 05:31:09.111981
325	108	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-13	Fernan old client	2026-06-12	2026-06-13	4000.00	Veloz	2026-06-13 05:31:09.143837
326	108	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Fernan old client	2026-06-12	2026-06-13	4000.00	Veloz	2026-06-13 05:31:09.175509
327	108	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-13	2026-06-15	Fernan old client	2026-06-12	2026-06-15	4000.00	Veloz	2026-06-14 02:47:01.157268
328	108	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	4000.00	6500	Fernan old client	2026-06-12	2026-06-15	6500.00	Veloz	2026-06-14 02:48:20.755551
329	111	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Joselito Cheng	2026-06-13	2026-06-15	5000.00	Hilux	2026-06-15 06:14:56.8711
330	111	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-15	Joselito Cheng	2026-06-13	2026-06-15	5000.00	Hilux	2026-06-15 06:14:56.910772
331	111	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Joselito Cheng	2026-06-13	2026-06-15	5000.00	Hilux	2026-06-15 06:14:56.943616
332	115	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Gervin antacio	2026-06-13	2026-06-14	3000.00	MUX	2026-06-15 11:28:13.851477
333	116	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Phoebe ymil	2026-06-16	2026-06-17	3000.00	Hilux	2026-06-15 11:29:15.49078
334	117	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	aaren mendoza	2026-08-01	2026-08-03	6000.00	Terra O	2026-06-17 02:32:10.667611
335	118	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Vernz Cari	2026-08-28	2026-09-22	45000.00	Terra O	2026-06-17 02:36:16.472392
336	119	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	John paul harder return client	2026-07-02	2026-08-06	80000.00	Everest	2026-06-18 12:02:58.007595
337	97	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Renz arroyo QC	2026-06-18	2026-08-10	121000.00	EVEREST BLUE	2026-06-18 21:26:51.626686
338	97	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-19	Renz arroyo QC	2026-06-18	2026-08-10	121000.00	EVEREST BLUE	2026-06-18 21:26:51.673993
339	97	10	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Renz arroyo QC	2026-06-18	2026-08-10	121000.00	EVEREST BLUE	2026-06-18 21:26:51.708742
340	96	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Ivy Laurice IMUS	2026-06-16	2026-07-02	32000.00	Terra O	2026-06-18 21:28:59.662408
341	96	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-19	Ivy Laurice IMUS	2026-06-16	2026-07-02	32000.00	Terra O	2026-06-18 21:28:59.693724
342	96	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gotyme	Ivy Laurice IMUS	2026-06-16	2026-07-02	32000.00	Terra O	2026-06-18 21:28:59.729694
343	115	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Gervin antacio	2026-06-13	2026-06-14	3000.00	MUX	2026-06-18 21:29:33.930137
344	115	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-19	Gervin antacio	2026-06-13	2026-06-14	3000.00	MUX	2026-06-18 21:29:33.960337
345	115	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Gervin antacio	2026-06-13	2026-06-14	3000.00	MUX	2026-06-18 21:29:33.990706
346	116	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Phoebe ymil	2026-06-16	2026-06-17	3000.00	Hilux	2026-06-18 21:29:41.819376
347	116	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-19	Phoebe ymil	2026-06-16	2026-06-17	3000.00	Hilux	2026-06-18 21:29:41.849621
348	116	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Phoebe ymil	2026-06-16	2026-06-17	3000.00	Hilux	2026-06-18 21:29:41.879609
349	120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Darell Consignado	2026-06-19	2026-06-29	20000.00	Hilux	2026-06-19 11:58:28.226337
350	120	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Darell Consignado	2026-06-19	2026-06-29	20000.00	Hilux	2026-06-19 15:06:04.488015
351	120	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-19	Darell Consignado	2026-06-19	2026-06-29	20000.00	Hilux	2026-06-19 15:06:04.530476
352	120	6	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Darell Consignado	2026-06-19	2026-06-29	20000.00	Hilux	2026-06-19 15:06:04.56886
353	121	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-06-22	2026-06-25	7500.00	GAC M6	2026-06-23 02:39:06.386996
354	122	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Emil Aglugub	2026-06-25	2026-06-27	5000.00	Innova	2026-06-23 02:40:05.667878
355	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-17	2026-06-20	John kyle Return client	2026-06-10	2026-06-20	18000.00	Innova	2026-06-23 15:16:16.935285
356	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	12600.00	18000	John kyle Return client	2026-06-10	2026-06-20	18000.00	Innova	2026-06-23 15:16:16.977243
357	123	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Anj Ocampo	2026-06-26	2026-06-27	2500.00	GAC M6	2026-06-24 01:47:32.184239
358	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-20	2026-06-24	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-06-24 02:01:52.641358
359	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	18000.00	25000	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-06-24 02:01:52.684152
360	113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	notes		18000 paid	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-06-24 02:01:52.71451
361	124	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Ara Johanna Old client Dubai	2026-07-13	2026-07-31	34000.00	Terra O	2026-06-24 03:50:51.566757
362	125	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Pat Sebastian	2026-08-09	2026-08-23	29400.00	Terra O	2026-06-24 04:56:16.734255
363	126	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	John kyle Return client	2026-06-24	2026-07-01	10500.00	MUX	2026-06-24 14:41:54.122708
364	123	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-27	2026-06-28	Anj Ocampo	2026-06-26	2026-06-28	5000.00	GAC M6	2026-06-25 23:45:10.172664
365	123	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	2500.00	5000	Anj Ocampo	2026-06-26	2026-06-28	5000.00	GAC M6	2026-06-25 23:45:10.246859
366	122	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Emil Aglugub	2026-06-25	2026-06-27	5000.00	Innova	2026-06-26 01:39:29.68327
367	122	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-26	Emil Aglugub	2026-06-25	2026-06-27	5000.00	Innova	2026-06-26 01:39:29.721398
368	122	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Emil Aglugub	2026-06-25	2026-06-27	5000.00	Innova	2026-06-26 01:39:29.753226
369	124	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-07-31	2026-08-07	Ara Johanna Old client Dubai	2026-07-13	2026-08-07	42000.00	Terra O	2026-06-26 02:38:27.369791
370	124	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	34000.00	42000	Ara Johanna Old client Dubai	2026-07-13	2026-08-07	42000.00	Terra O	2026-06-26 02:38:27.414199
371	127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-27 01:20:19.726373
372	128	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	John Arvin	2026-06-27	2026-06-28	2500.00	Veloz	2026-06-27 01:20:48.100332
373	129	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-06-26	2026-06-28	5000.00	Everest	2026-06-27 01:23:12.361523
374	127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-26	2026-07-01	Erlord norway	2026-06-25	2026-07-01	15000.00	Veloz	2026-06-27 16:33:00.977281
375	127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	2500.00	15000	Erlord norway	2026-06-25	2026-07-01	15000.00	Veloz	2026-06-27 16:33:01.015368
376	127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-07-01	2026-06-26	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-27 16:34:23.565059
377	127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	15000.00	2500	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-27 16:34:23.596018
378	129	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-28	2026-07-01	Erlord norway	2026-06-26	2026-07-01	12500.00	Everest	2026-06-27 16:34:41.97311
379	129	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	5000.00	12500	Erlord norway	2026-06-26	2026-07-01	12500.00	Everest	2026-06-27 16:34:42.004262
380	128	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-28	2026-06-29	John Arvin	2026-06-27	2026-06-29	5000.00	Veloz	2026-06-27 16:35:05.599141
381	128	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	2500.00	5000	John Arvin	2026-06-27	2026-06-29	5000.00	Veloz	2026-06-27 16:35:05.629328
382	122	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-27	2026-06-28	Emil Aglugub	2026-06-25	2026-06-28	7500.00	Innova	2026-06-27 16:35:28.516661
383	122	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	5000.00	7500	Emil Aglugub	2026-06-25	2026-06-28	7500.00	Innova	2026-06-27 16:35:28.550453
384	122	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	notes		5k paid	Emil Aglugub	2026-06-25	2026-06-28	7500.00	Innova	2026-06-27 16:35:28.584397
385	120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-06-29	2026-07-09	Darell Consignado	2026-06-19	2026-07-09	38000.00	Hilux	2026-06-28 12:37:37.946576
386	120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	20000.00	38000	Darell Consignado	2026-06-19	2026-07-09	38000.00	Hilux	2026-06-28 12:37:37.990099
387	127	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-28 17:26:45.962043
388	127	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-29	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-28 17:26:46.002364
389	127	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Erlord norway	2026-06-25	2026-06-26	2500.00	Veloz	2026-06-28 17:26:46.035408
390	121	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-06-22	2026-06-25	7500.00	GAC M6	2026-06-28 17:27:54.057893
391	121	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-29	Erlord norway	2026-06-22	2026-06-25	7500.00	GAC M6	2026-06-28 17:27:54.090113
392	121	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Erlord norway	2026-06-22	2026-06-25	7500.00	GAC M6	2026-06-28 17:27:54.12241
393	123	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Anj Ocampo	2026-06-26	2026-06-28	5000.00	GAC M6	2026-06-28 17:28:03.400415
394	123	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-29	Anj Ocampo	2026-06-26	2026-06-28	5000.00	GAC M6	2026-06-28 17:28:03.432655
395	123	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Anj Ocampo	2026-06-26	2026-06-28	5000.00	GAC M6	2026-06-28 17:28:03.46507
396	128	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	John Arvin	2026-06-27	2026-06-29	5000.00	Veloz	2026-06-29 17:51:00.724149
397	128	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-06-30	John Arvin	2026-06-27	2026-06-29	5000.00	Veloz	2026-06-29 17:51:00.769817
398	128	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	John Arvin	2026-06-27	2026-06-29	5000.00	Veloz	2026-06-29 17:51:00.822222
399	129	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-06-26	2026-07-01	12500.00	Everest	2026-06-30 16:10:26.446893
400	129	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-01	Erlord norway	2026-06-26	2026-07-01	12500.00	Everest	2026-06-30 16:10:26.488351
401	129	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Erlord norway	2026-06-26	2026-07-01	12500.00	Everest	2026-06-30 16:10:26.519043
402	130	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Erlord norway	2026-07-02	2026-07-12	20000.00	Terra O	2026-07-02 12:22:34.323929
403	113	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-07-02 14:05:35.432483
404	113	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-02	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-07-02 14:05:35.47801
405	113	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	John kyle Return client	2026-06-10	2026-06-24	25000.00	Innova	2026-07-02 14:05:35.512993
406	119	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	John paul harder return client	2026-07-02	2026-08-06	80000.00	Everest	2026-07-02 14:09:00.841165
407	119	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-02	John paul harder return client	2026-07-02	2026-08-06	80000.00	Everest	2026-07-02 14:09:00.888807
408	119	5	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	John paul harder return client	2026-07-02	2026-08-06	80000.00	Everest	2026-07-02 14:09:00.923612
409	130	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Erlord norway	2026-07-02	2026-07-12	20000.00	Terra O	2026-07-02 14:09:21.369462
410	130	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-02	Erlord norway	2026-07-02	2026-07-12	20000.00	Terra O	2026-07-02 14:09:21.404736
411	130	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Erlord norway	2026-07-02	2026-07-12	20000.00	Terra O	2026-07-02 14:09:21.440779
412	131	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Las pinas renter	2026-07-05	2026-07-05	1500.00	Veloz	2026-07-05 04:48:21.966683
413	132	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Arjay 	2026-07-05	2026-07-06	2500.00	GAC M6	2026-07-05 04:48:54.862396
414	133	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Charles Las pinas	2026-07-04	2026-07-05	2500.00	MUX	2026-07-05 04:49:20.617857
415	134	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Nadia Llanes	2026-07-16	2026-08-15	40000.00	Veloz	2026-07-05 05:29:02.579206
416	133	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Charles Las pinas	2026-07-04	2026-07-05	2500.00	MUX	2026-07-06 13:24:52.47837
417	133	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-06	Charles Las pinas	2026-07-04	2026-07-05	2500.00	MUX	2026-07-06 13:24:52.518533
418	133	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Charles Las pinas	2026-07-04	2026-07-05	2500.00	MUX	2026-07-06 13:24:52.553796
419	131	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Las pinas renter	2026-07-05	2026-07-05	1500.00	Veloz	2026-07-06 13:25:01.062098
420	131	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-06	Las pinas renter	2026-07-05	2026-07-05	1500.00	Veloz	2026-07-06 13:25:01.097199
421	131	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Las pinas renter	2026-07-05	2026-07-05	1500.00	Veloz	2026-07-06 13:25:01.131861
422	132	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Arjay 	2026-07-05	2026-07-06	2500.00	GAC M6	2026-07-06 13:25:12.589837
423	132	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-06	Arjay 	2026-07-05	2026-07-06	2500.00	GAC M6	2026-07-06 13:25:12.622993
424	132	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Arjay 	2026-07-05	2026-07-06	2500.00	GAC M6	2026-07-06 13:25:12.657742
425	135	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Patrica talavera	2026-07-10	2026-07-12	4000.00	Innova	2026-07-08 11:29:50.772003
426	136	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Justin perlas	2026-07-11	2026-07-12	3200.00	MUX	2026-07-08 11:31:29.003226
427	137	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Teddy San jose	2026-07-08	2026-07-13	7500.00	GAC M6	2026-07-08 11:32:11.41847
428	120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-07-09	2026-07-19	Darell Consignado	2026-06-19	2026-07-19	50000.00	Hilux	2026-07-09 02:57:28.710338
429	120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	38000.00	50000	Darell Consignado	2026-06-19	2026-07-19	50000.00	Hilux	2026-07-09 02:57:28.748485
430	135	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Patrica talavera	2026-07-10	2026-07-12	4000.00	Innova	2026-07-10 15:20:07.212303
431	135	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-10	Patrica talavera	2026-07-10	2026-07-12	4000.00	Innova	2026-07-10 15:20:07.256243
432	135	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Patrica talavera	2026-07-10	2026-07-12	4000.00	Innova	2026-07-10 15:20:07.289695
433	136	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Justin perlas	2026-07-11	2026-07-12	3200.00	MUX	2026-07-12 07:29:57.835877
434	136	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-12	Justin perlas	2026-07-11	2026-07-12	3200.00	MUX	2026-07-12 07:29:57.876901
435	136	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Justin perlas	2026-07-11	2026-07-12	3200.00	MUX	2026-07-12 07:29:57.909647
436	138	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Indira BFRV	2026-07-12	2026-07-13	2500.00	Veloz	2026-07-13 04:01:13.088628
437	139	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Phoenix Las pinas 	2026-07-12	2026-07-13	1500.00	Innova	2026-07-13 04:02:15.869827
438	140	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Ej angeles	2026-07-17	2026-07-21	10000.00	MUX	2026-07-13 07:19:05.240521
439	124	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Ara Johanna Old client Dubai	2026-07-13	2026-08-07	42000.00	Terra O	2026-07-14 14:06:53.607699
440	124	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-14	Ara Johanna Old client Dubai	2026-07-13	2026-08-07	42000.00	Terra O	2026-07-14 14:06:53.64646
441	124	3	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BPI	Ara Johanna Old client Dubai	2026-07-13	2026-08-07	42000.00	Terra O	2026-07-14 14:06:53.678922
442	138	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Indira BFRV	2026-07-12	2026-07-13	2500.00	Veloz	2026-07-14 14:07:05.379527
443	138	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-14	Indira BFRV	2026-07-12	2026-07-13	2500.00	Veloz	2026-07-14 14:07:05.412776
444	138	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Indira BFRV	2026-07-12	2026-07-13	2500.00	Veloz	2026-07-14 14:07:05.443957
445	139	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Phoenix Las pinas 	2026-07-12	2026-07-13	1500.00	Innova	2026-07-14 14:07:23.048142
446	139	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-14	Phoenix Las pinas 	2026-07-12	2026-07-13	1500.00	Innova	2026-07-14 14:07:23.077447
447	139	4	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Cash	Phoenix Las pinas 	2026-07-12	2026-07-13	1500.00	Innova	2026-07-14 14:07:23.108143
448	137	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	endDate	2026-07-13	2026-07-17	Teddy San jose	2026-07-08	2026-07-17	13500.00	GAC M6	2026-07-15 15:51:45.058673
449	137	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	updated	totalAmount	7500.00	13500	Teddy San jose	2026-07-08	2026-07-17	13500.00	GAC M6	2026-07-15 15:51:45.104983
450	140	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Ej angeles	2026-07-17	2026-07-21	10000.00	MUX	2026-07-17 15:04:33.565123
451	140	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-17	Ej angeles	2026-07-17	2026-07-21	10000.00	MUX	2026-07-17 15:04:33.620942
452	140	2	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		Gcash Pat	Ej angeles	2026-07-17	2026-07-21	10000.00	MUX	2026-07-17 15:04:33.653896
453	134	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentStatus	pending	confirmed	Nadia Llanes	2026-07-16	2026-08-15	40000.00	Veloz	2026-07-17 15:04:48.415648
454	134	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentDate		2026-07-17	Nadia Llanes	2026-07-16	2026-08-15	40000.00	Veloz	2026-07-17 15:04:48.448863
455	134	8	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	updated	paymentBank		BDO	Nadia Llanes	2026-07-16	2026-08-15	40000.00	Veloz	2026-07-17 15:04:48.482096
456	\N	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	X	2026-09-03	2026-09-04	500.00	Terra N	2026-07-17 15:24:15.072284
457	\N	1	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	deleted	\N	\N	\N	X	2026-09-01	2026-09-02	500.00	Terra N	2026-07-17 15:24:20.684494
458	141	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	created	\N	\N	\N	Queen Segunial Laguna	2026-07-05	2026-09-03	150000.00	Terra N	2026-07-18 02:50:47.99776
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rentals (id, car_id, user_id, customer_name, customer_email, customer_phone, start_date, end_date, days_rented, total_amount, payment_screenshot_url, is_finalized, notes, created_at, updated_at, customer_id, last_finalize_reminder, payment_status, payment_date, payment_bank, reservation_fee, reservation_status, reservation_date, reservation_bank, reservation_screenshot_url) FROM stdin;
36	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Sir glenn pulis	\N	\N	2026-01-28	2026-02-04	7	14000.00	\N	t	\N	2026-02-13 12:29:55.079319	2026-02-13 12:38:46.85	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
22	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Kyle muntinlupa	\N	\N	2026-01-10	2026-01-15	6	10000.00	\N	t	\N	2026-01-14 16:11:05.252096	2026-01-15 15:08:39.968	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
6	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Yumi pasig	\N	\N	2025-12-05	2025-12-16	12	25500.00	\N	t	\N	2025-12-05 08:19:04.142084	2025-12-05 08:19:39.669	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
5	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Quennie Segunial	\N	\N	2025-12-05	2025-12-31	27	54000.00	\N	t	\N	2025-12-05 08:18:07.174599	2025-12-05 08:19:42.772	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
3	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jason Grey Pampanga	\N	\N	2025-12-01	2025-12-31	31	70000.00	\N	t	30 days rent	2025-12-02 16:57:00.66641	2025-12-05 08:19:44.399	\N	2025-12-02 17:31:46.242	confirmed	\N	\N	\N	none	\N	\N	\N
2	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Joshua J	\N	\N	2025-12-05	2026-01-04	31	45000.00	\N	t	30 days Rent	2025-12-02 16:55:19.368699	2025-12-05 08:19:45.866	\N	2025-12-02 17:31:53.562	confirmed	\N	\N	\N	none	\N	\N	\N
4	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Jason Grey Pampanga	\N	\N	2025-12-06	2026-01-05	31	45000.00	\N	t	From 40k to 45k	2025-12-02 17:34:18.33194	2025-12-05 08:21:02.506	\N	2025-12-02 17:34:50.26	confirmed	\N	\N	\N	none	\N	\N	\N
26	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Spain renter	\N	\N	2026-01-21	2026-02-10	20	40000.00	\N	t	\N	2026-01-22 17:12:14.920439	2026-01-22 17:12:45.099	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
9	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Sugar Pasig	\N	\N	2025-12-05	2025-12-28	24	45000.00	\N	t	\N	2025-12-05 08:23:31.590284	2025-12-05 18:42:47.849	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
8	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Mark D. Laguna	\N	\N	2025-12-05	2025-12-22	18	31500.00	\N	t	\N	2025-12-05 08:22:51.066215	2025-12-05 18:42:49.882	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
7	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Dubai renter	\N	\N	2025-12-05	2025-12-24	20	45000.00	\N	t	21 days	2025-12-05 08:20:49.02527	2025-12-05 18:42:51.809	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
11	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Redd Buhol	\N	\N	2025-12-30	2026-01-02	4	10000.00	\N	t	\N	2026-01-05 14:23:04.646562	2026-01-05 14:24:21.231	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
10	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Yumi pasig	\N	\N	2025-12-18	2026-01-06	20	25000.00	\N	t	PIck up 11pm Jan 6 2025	2026-01-05 14:20:36.652924	2026-01-05 14:24:26.199	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
25	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Europe Renter	\N	\N	2026-01-22	2026-01-25	3	9000.00	\N	t	\N	2026-01-22 17:10:46.495195	2026-01-22 17:12:46.711	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
24	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Dubai Bacoor renter 	\N	\N	2026-01-21	2026-01-24	3	7500.00	\N	t	\N	2026-01-22 17:09:52.943592	2026-01-22 17:12:48.058	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
13	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	MC yap 	\N	\N	2025-12-24	2026-01-21	29	40000.00	\N	t	\N	2026-01-05 14:26:12.929746	2026-01-05 14:28:49.18	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
12	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Inday Camella 	\N	\N	2026-01-04	2026-01-08	5	10000.00	\N	t	4 days Rent 	2026-01-05 14:24:36.400598	2026-01-05 14:28:52.206	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
15	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial	\N	\N	2026-01-01	2026-01-31	31	54000.00	\N	t	\N	2026-01-05 14:27:28.511413	2026-01-05 14:43:11.267	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
18	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Julie europe	\N	\N	2026-01-09	2026-01-19	11	25000.00	\N	t	\N	2026-01-11 13:38:33.236768	2026-01-11 13:45:58.866	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
17	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jan Spain	\N	\N	2026-01-11	2026-02-10	31	54000.00	\N	t	\N	2026-01-11 13:34:58.344833	2026-01-11 13:46:00.544	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
28	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Return client	\N	\N	2026-01-24	2026-01-25	1	3000.00	\N	t	\N	2026-01-22 17:15:42.086637	2026-01-23 04:54:12.602	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
19	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Camella Japan	\N	\N	2026-01-08	2026-01-28	21	32000.00	\N	t	\N	2026-01-11 13:46:37.102647	2026-01-13 05:17:15.023	\N	2026-01-12 01:36:34.586	confirmed	\N	\N	\N	none	\N	\N	\N
20	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jason Bumbay	\N	\N	2026-01-01	2026-01-13	13	32500.00	\N	t	\N	2026-01-14 16:01:40.859454	2026-01-14 16:05:10.415	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
21	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Roan peddington	\N	\N	2026-01-14	2026-01-15	2	4000.00	\N	t	\N	2026-01-14 16:06:31.966891	2026-01-14 16:10:20.562	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
23	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	BUMBAY	\N	\N	2026-01-06	2026-01-13	8	14000.00	\N	t	\N	2026-01-14 16:11:33.121274	2026-01-14 16:22:49.012	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
27	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Bacolod renter Ken paroginog	\N	\N	2026-01-24	2026-01-27	3	7500.00	\N	t	\N	2026-01-22 17:14:26.034607	2026-01-23 04:54:14.365	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
30	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Verdant renter	\N	\N	2026-02-02	2026-02-03	1	3000.00	\N	t	\N	2026-02-06 14:09:57.884241	2026-02-07 06:14:30.44	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
29	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Verdant renter	\N	\N	2026-01-31	2026-02-01	1	3000.00	\N	t	\N	2026-02-06 14:09:13.382307	2026-02-07 06:14:31.867	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
32	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Moonwalk	\N	\N	2026-02-07	2026-02-08	1	3000.00	\N	t	\N	2026-02-09 14:58:36.055137	2026-02-10 14:39:18.657	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
31	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Cathy bacoor	\N	\N	2026-01-29	2026-02-10	12	21600.00	\N	t	\N	2026-02-09 14:57:57.04166	2026-02-10 14:39:21.057	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
33	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Dr.Caballero	\N	\N	2026-02-12	2026-02-16	4	14000.00	\N	t	\N	2026-02-12 00:20:41.776677	2026-02-12 01:45:14.559	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
35	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	YUPIO NAIA	\N	\N	2026-02-14	2026-02-27	13	26000.00	\N	t	\N	2026-02-12 01:47:37.699877	2026-02-13 12:23:17.433	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
34	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial	\N	\N	2026-02-01	2026-03-02	29	54000.00	\N	t	\N	2026-02-12 01:46:34.985165	2026-02-13 12:23:19.483	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
39	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Patrick Dacanay Cainta	\N	\N	2026-02-16	2026-02-20	4	10000.00	\N	t	\N	2026-02-13 12:36:32.469782	2026-02-13 12:38:42.603	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
38	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Sir Glenn pulis	\N	\N	2026-02-05	2026-03-07	30	42000.00	\N	t	\N	2026-02-13 12:35:29.726126	2026-02-13 12:38:43.693	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
37	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Krisha US	\N	\N	2026-02-12	2026-02-15	3	9000.00	\N	t	\N	2026-02-13 12:34:11.967239	2026-02-13 12:38:45.241	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
40	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Hepe Renter company	\N	\N	2026-02-16	2026-03-18	30	32000.00	\N	t	\N	2026-02-13 12:39:18.822693	2026-02-13 13:23:56.293	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
52	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-03-05	2026-03-12	7	21000.00	\N	t	\N	2026-03-07 01:29:10.611315	2026-03-15 06:24:32.47	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
42	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Vett Muntinlupa	\N	\N	2026-02-17	2026-02-19	2	7000.00	\N	t	\N	2026-02-17 14:35:49.134167	2026-02-17 14:37:37.911	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
43	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	US client 	\N	\N	2026-02-17	2026-02-20	3	9000.00	\N	t	\N	2026-02-17 14:40:09.85562	2026-02-17 14:44:01.872	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
44	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Donnie US	\N	\N	2026-02-22	2026-03-01	7	24500.00	\N	t	\N	2026-02-17 14:45:11.925394	2026-02-17 14:49:10.648	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
45	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jan rafada	\N	\N	2026-02-25	2026-02-28	3	7500.00	\N	t	\N	2026-02-25 04:46:00.050154	2026-03-03 12:09:37.816	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
49	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Amero apple US	\N	\N	2026-04-22	2026-05-22	30	45000.00	\N	t	\N	2026-03-03 13:12:38.658497	2026-03-03 13:44:54.168	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
48	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Art US	\N	\N	2026-03-14	2026-04-13	30	45000.00	\N	t	\N	2026-03-03 12:53:19.322249	2026-03-14 08:32:08.565	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
47	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Diaz Pangasinan bacoor	\N	\N	2026-03-01	2026-04-20	50	75000.00	\N	t	\N	2026-03-03 12:12:28.635228	2026-03-03 13:44:57.355	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
46	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jerome UK	\N	\N	2026-03-01	2026-03-08	7	14000.00	\N	t	\N	2026-03-03 12:11:23.529713	2026-03-03 13:44:58.888	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
51	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	ms. boloto	\N	\N	2026-03-07	2026-03-08	1	2500.00	\N	t	\N	2026-03-07 01:28:07.304241	2026-03-07 01:33:05.863	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
50	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Canada 	\N	\N	2026-03-07	2026-03-10	3	9000.00	\N	t	\N	2026-03-07 01:27:41.33824	2026-03-07 01:33:07.314	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
59	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Muntinlupa	\N	\N	2026-03-13	2026-03-15	2	5500.00	\N	t	\N	2026-03-14 08:34:47.038098	2026-03-15 06:24:56.354	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
54	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial Laguna	\N	\N	2026-03-06	2026-04-05	30	54000.00	\N	t	\N	2026-03-10 02:13:07.707707	2026-03-10 03:34:42.736	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
53	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Sugar Pasig renter	\N	\N	2026-03-13	2026-04-12	30	50000.00	\N	t	\N	2026-03-10 01:57:16.859722	2026-03-10 03:34:44.614	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
56	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jherbie Pato pasig	\N	\N	2026-03-13	2026-03-20	7	21000.00	\N	t	\N	2026-03-13 23:25:36.087956	2026-03-13 23:27:13.546	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
55	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Canadian	\N	\N	2026-03-13	2026-03-14	1	2500.00	\N	t	\N	2026-03-13 23:25:06.092278	2026-03-13 23:27:15.148	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
57	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Canadian	\N	\N	2026-03-20	2026-03-22	2	6000.00	\N	t	\N	2026-03-13 23:26:19.850662	2026-03-15 06:25:21.722	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
58	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Hepe renter	\N	\N	2026-03-19	2026-04-18	30	32000.00	\N	t	\N	2026-03-14 08:34:06.382366	2026-03-14 12:48:12.763	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
61	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Gwen pasay	\N	\N	2026-04-01	2026-04-04	3	9000.00	\N	t	\N	2026-04-02 15:09:27.940136	2026-04-05 12:45:01.021	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
60	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Castro CEO	\N	\N	2026-03-30	2026-04-06	7	21000.00	\N	t	\N	2026-04-02 15:08:49.748184	2026-04-05 12:45:02.907	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
63	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Gemil Pasay	\N	\N	2026-04-14	2026-04-21	7	17500.00	\N	t	\N	2026-04-08 04:13:29.632712	2026-04-18 00:43:28.258	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
62	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	CEO ONYX pampanga	\N	\N	2026-04-07	2026-04-13	6	17500.00	\N	t	\N	2026-04-08 04:12:42.765811	2026-04-18 00:43:30.024	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
88	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Muntinlupa Renter	\N	\N	2026-05-16	2026-05-17	1	3500.00	\N	f	\N	2026-05-15 12:50:09.846167	2026-05-19 13:50:11.676	\N	\N	confirmed	2026-05-19	cash	\N	none	\N	\N	\N
66	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Mark Denniz Guzman	\N	\N	2026-04-21	2026-05-01	10	17000.00	\N	t	\N	2026-04-18 00:55:11.211166	2026-04-20 08:30:49.642	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
65	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	CEO pampanga	\N	\N	2026-04-14	2026-04-20	6	17500.00	\N	t	\N	2026-04-18 00:46:19.799607	2026-04-20 08:30:50.654	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
68	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	CEO pampanga	\N	\N	2026-04-21	2026-05-04	13	35000.00	\N	t	\N	2026-04-20 08:31:58.11017	2026-04-28 21:20:33.414	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
94	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Johannes UST	\N	\N	2026-05-25	2026-05-27	2	7000.00	\N	f	\N	2026-05-23 02:51:23.172588	2026-05-29 16:44:45.847	\N	\N	confirmed	2026-05-30	Gcash Pat	\N	none	\N	\N	\N
41	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Michael Sargento US client(moimoi)	\N	\N	2026-03-26	2026-05-02	37	52000.00	\N	t	\N	2026-02-13 13:21:47.424372	2026-04-30 05:06:27.677	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
64	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial	\N	\N	2026-04-06	2026-06-05	60	100000.00	\N	t	\N	2026-04-18 00:44:50.929004	2026-04-30 05:11:09.251	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
71	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Earl Manrique Return client	\N	\N	2026-05-07	2026-05-14	7	14000.00	\N	t	\N	2026-04-28 23:02:46.221666	2026-04-30 05:11:14.325	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
84	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Ellen bulacan	\N	\N	2026-05-10	2026-05-20	10	26000.00	\N	f	\N	2026-05-12 05:51:38.802757	2026-05-21 13:29:50.415	\N	\N	confirmed	2026-05-21	Cash	\N	none	\N	\N	\N
90	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Kyla pasay	\N	\N	2026-05-21	2026-05-22	1	4000.00	\N	f	\N	2026-05-20 14:22:59.189299	2026-05-21 13:30:11.655	\N	\N	confirmed	2026-05-21	Gcash Pat	\N	none	\N	\N	\N
72	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Hepe renter	\N	\N	2026-04-18	2026-05-18	30	38000.00	\N	t	\N	2026-04-30 05:20:49.780923	2026-04-30 05:33:50.575	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
79	9	2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	Test Customer	\N	\N	2026-05-10	2026-05-14	4	5000.00	\N	f	\N	2026-05-06 13:46:31.03363	2026-05-06 13:46:31.03363	\N	\N	pending	\N	\N	1000.00	pending	\N	\N	\N
70	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Mariles Quilas Return client 	\N	\N	2026-04-30	2026-05-12	12	26400.00	\N	t	\N	2026-04-28 21:23:53.289859	2026-04-30 13:03:24.632	\N	\N	confirmed	\N	\N	\N	none	\N	\N	\N
89	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Jan rafada	\N	\N	2026-05-24	2026-05-27	3	7500.00	\N	f	Change destination 2500 per day	2026-05-19 06:33:51.340618	2026-05-29 16:45:21.493	\N	\N	confirmed	2026-05-30	Gcash Pat	\N	none	\N	\N	\N
80	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	RJ brother	\N	\N	2026-05-03	2026-05-04	1	6000.00	\N	f	\N	2026-05-08 23:08:34.942276	2026-05-11 17:58:51.179	\N	\N	confirmed	2026-05-12	Gcash Pachu	\N	none	\N	\N	\N
73	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Australia Renter	\N	09171234567	2026-05-23	2026-06-08	16	32000.00	\N	t	\N	2026-04-30 11:50:00.212391	2026-05-05 14:02:59.769	\N	\N	confirmed	2026-05-05	BPI	\N	none	\N	\N	\N
86	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Taguig Renter 	\N	\N	2026-05-16	2026-05-18	2	6000.00	\N	f	\N	2026-05-15 06:29:41.666337	2026-05-18 15:09:05.914	\N	\N	confirmed	2026-05-18	Cash	\N	none	\N	\N	\N
87	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	John kyle Return client	\N	\N	2026-05-13	2026-05-19	6	18000.00	\N	f	\N	2026-05-15 06:30:57.433504	2026-05-19 06:22:00.508	\N	\N	confirmed	2026-05-18	Cash	\N	none	\N	\N	\N
81	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Geologo	\N	\N	2026-05-04	2026-05-08	4	7500.00	\N	f	-2500 battery issue	2026-05-08 23:09:21.533025	2026-05-19 13:46:19.415	\N	\N	confirmed	2026-05-19	Cash	\N	none	\N	\N	\N
85	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Gia bambao	\N	\N	2026-05-12	2026-05-14	2	5000.00	\N	f	\N	2026-05-12 05:52:23.413511	2026-05-19 13:50:01.101	\N	\N	confirmed	2026-05-19	gCash	\N	none	\N	\N	\N
92	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Christine Taguig	\N	\N	2026-05-22	2026-05-24	2	7000.00	\N	f	\N	2026-05-23 02:49:57.690721	2026-05-24 03:42:53.152	\N	\N	confirmed	2026-05-24	Gcash Pat	\N	none	\N	\N	\N
93	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Leo	\N	\N	2026-05-23	2026-05-24	1	4000.00	\N	f	\N	2026-05-23 02:50:21.489822	2026-05-24 03:43:22.984	\N	\N	confirmed	2026-05-24	Gcash Pat	\N	none	\N	\N	\N
98	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Matt SJBM	\N	\N	2026-05-30	2026-05-31	1	4000.00	\N	f	\N	2026-06-01 03:32:47.244212	2026-06-03 15:20:18.996	\N	\N	confirmed	2026-06-03	Cash	\N	none	\N	\N	\N
99	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erold	\N	\N	2026-05-31	2026-06-03	3	7500.00	\N	f	\N	2026-06-01 03:33:18.312156	2026-06-03 15:23:05.041	\N	\N	confirmed	2026-06-03	Gcash Pat	\N	none	\N	\N	\N
95	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Mark dumaraos	\N	\N	2026-05-29	2026-06-07	9	18000.00	\N	f	\N	2026-05-23 02:58:35.765776	2026-05-29 15:14:48.395	\N	\N	confirmed	2026-05-29	Cash	\N	none	\N	\N	\N
101	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	ErLord	\N	\N	2026-06-03	2026-06-06	3	7500.00	\N	f	\N	2026-06-03 12:58:49.698714	2026-06-03 15:23:34.196	\N	\N	confirmed	2026-06-03	Gcash Pat	\N	none	\N	\N	\N
67	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Hepe Renter company	\N	\N	2026-04-19	2026-05-16	27	32000.00	\N	t	\N	2026-04-18 01:14:51.583905	2026-06-04 04:07:22.11	\N	\N	confirmed	2026-05-05	BPI	\N	none	\N	\N	\N
91	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Kyle Muntilupa	\N	\N	2026-05-23	2026-05-30	7	17000.00	\N	f	\N	2026-05-23 02:49:24.163148	2026-06-02 14:37:47.81	\N	\N	confirmed	2026-06-02	Cash	\N	none	\N	\N	\N
100	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Chrisjunmar Butuan	\N	\N	2026-05-31	2026-06-03	3	10499.97	\N	f	\N	2026-06-01 03:34:41.591573	2026-06-02 15:00:30.783	\N	\N	confirmed	2026-06-02	Cash	\N	none	\N	\N	\N
103	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Atan QC	\N	\N	2026-06-05	2026-06-08	3	7500.00	\N	f	\N	2026-06-04 12:07:04.560709	2026-06-05 16:59:21.572	\N	\N	confirmed	2026-06-06	Gcash Pat	\N	none	\N	\N	\N
106	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Chris LP	\N	\N	2026-06-06	2026-06-07	1	1800.00	\N	f	\n12 HRS RENT	2026-06-07 05:42:50.645316	2026-06-08 16:44:03.769	\N	\N	confirmed	2026-06-09	Gcash Pat	\N	none	\N	\N	\N
105	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Kyle Muntilupa	\N	\N	2026-05-30	2026-06-08	9	16200.00	\N	f	\N	2026-06-06 02:26:07.98515	2026-06-09 14:52:31.429	\N	\N	confirmed	2026-06-09	Gcash Pat	\N	none	\N	\N	\N
107	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Phoenix Las pinas 	\N	\N	2026-06-09	2026-06-10	1	4500.00	\N	f	1 day and 12hrs	2026-06-07 05:45:17.849266	2026-06-09 13:32:06.64	\N	\N	confirmed	2026-06-09	Cash	\N	none	\N	\N	\N
104	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	JONA PASIG	\N	\N	2026-06-05	2026-06-07	2	8000.00	\N	f	\N	2026-06-06 01:15:11.211253	2026-06-08 16:44:22.973	\N	\N	confirmed	2026-06-09	Gcash Pat	\N	none	\N	\N	\N
109	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-06-06	2026-06-09	3	8500.00	\N	f	\N	2026-06-07 15:30:58.041184	2026-06-09 13:31:15.378	\N	\N	confirmed	2026-06-09	Gcash Pat	\N	none	\N	\N	\N
110	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-06-11	2026-06-21	10	25000.00	\N	f	\N	2026-06-09 03:45:41.301551	2026-06-11 13:53:42.176	\N	\N	confirmed	2026-06-11	BPI	\N	none	\N	\N	\N
102	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Hepe Renter company	\N	\N	2026-05-17	2026-06-01	15	1.00	\N	f	\N	2026-06-04 04:08:13.717731	2026-06-11 13:56:50.995	\N	\N	confirmed	2026-06-11	Gcash Pat	\N	none	\N	\N	\N
108	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Fernan old client	\N	\N	2026-06-12	2026-06-15	3	6500.00	\N	f	1 day 12hrs	2026-06-07 06:01:25.772675	2026-06-14 02:48:20.675	\N	\N	confirmed	2026-06-13	Gcash Pat	\N	none	\N	\N	\N
111	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Joselito Cheng	\N	\N	2026-06-13	2026-06-15	2	5000.00	\N	f	\N	2026-06-09 03:47:54.765567	2026-06-15 06:14:56.79	\N	\N	confirmed	2026-06-15	Cash	\N	none	\N	\N	\N
97	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Renz arroyo QC	\N	\N	2026-06-18	2026-08-10	53	121000.00	\N	f	\N	2026-05-27 13:48:56.554936	2026-06-18 21:26:51.532	\N	\N	confirmed	2026-06-19	Cash	\N	none	\N	\N	\N
112	10	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Ethan Sroka	\N	\N	2026-06-11	2026-06-18	7	19600.00	\N	f	2800 per day\nCancel dpat titanuim gusto pinilit ko lang\n	2026-06-11 01:19:24.436752	2026-06-11 13:53:50.554	\N	\N	confirmed	2026-06-11	Cash	\N	none	\N	\N	\N
119	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	John paul harder return client	\N	\N	2026-07-02	2026-08-06	35	80000.00	\N	f	2300 per day\nold client	2026-06-18 12:02:57.9277	2026-07-02 14:09:00.743	\N	\N	confirmed	2026-07-02	Gcash Pat	\N	none	\N	\N	\N
114	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial Laguna	\N	\N	2026-06-09	2026-07-05	26	50000.00	\N	f	6 months contract\n30 days \nStart JUNE 5 to JULY 5 2026	2026-06-12 13:52:37.183177	2026-06-13 05:30:12.541	\N	\N	confirmed	2026-06-13	BPI	\N	none	\N	\N	\N
118	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Vernz Cari	\N	\N	2026-08-28	2026-09-22	25	45000.00	\N	f	\N	2026-06-17 02:36:16.408872	2026-06-17 02:36:16.408872	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
96	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Ivy Laurice IMUS	\N	\N	2026-06-16	2026-07-02	16	32000.00	\N	f	\N	2026-05-27 13:45:21.36803	2026-06-18 21:28:59.583	\N	\N	confirmed	2026-06-19	Gotyme	\N	none	\N	\N	\N
115	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Gervin antacio	\N	\N	2026-06-13	2026-06-14	1	3000.00	\N	f	\N	2026-06-15 11:28:13.769237	2026-06-18 21:29:33.855	\N	\N	confirmed	2026-06-19	Cash	\N	none	\N	\N	\N
116	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Phoebe ymil	\N	\N	2026-06-16	2026-06-17	1	3000.00	\N	f	\N	2026-06-15 11:29:15.427763	2026-06-18 21:29:41.744	\N	\N	confirmed	2026-06-19	Cash	\N	none	\N	\N	\N
130	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-07-02	2026-07-12	10	20000.00	\N	f	\N	2026-07-02 12:22:34.23896	2026-07-02 14:09:21.278	\N	\N	confirmed	2026-07-02	Cash	\N	none	\N	\N	\N
125	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Pat Sebastian	\N	\N	2026-08-09	2026-08-23	14	29400.00	\N	f	\N	2026-06-24 04:56:16.652002	2026-06-24 04:56:16.652002	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
126	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	John kyle Return client	\N	\N	2026-06-24	2026-07-01	7	10500.00	\N	f	\N	2026-06-24 14:41:54.043435	2026-06-24 14:41:54.043435	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
117	7	27547d82-1b21-4dd0-8edb-c4f8f749bbab	aaren mendoza	\N	\N	2026-08-01	2026-08-03	2	6000.00	\N	f	\N	2026-06-17 02:32:10.588665	2026-06-26 02:37:34.527	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
134	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Nadia Llanes	\N	\N	2026-07-16	2026-08-15	30	40000.00	\N	f	\N	2026-07-05 05:29:02.49967	2026-07-17 15:04:48.334	\N	\N	confirmed	2026-07-17	BDO	\N	none	\N	\N	\N
133	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Charles Las pinas	\N	\N	2026-07-04	2026-07-05	1	2500.00	\N	f	\N	2026-07-05 04:49:20.557919	2026-07-06 13:24:52.389	\N	\N	confirmed	2026-07-06	Cash	\N	none	\N	\N	\N
131	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Las pinas renter	\N	\N	2026-07-05	2026-07-05	1	1500.00	\N	f	\N	2026-07-05 04:48:21.885006	2026-07-06 13:25:00.973	\N	\N	confirmed	2026-07-06	Cash	\N	none	\N	\N	\N
132	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Arjay 	\N	\N	2026-07-05	2026-07-06	1	2500.00	\N	f	\N	2026-07-05 04:48:54.801551	2026-07-06 13:25:12.505	\N	\N	confirmed	2026-07-06	Cash	\N	none	\N	\N	\N
122	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Emil Aglugub	\N	\N	2026-06-25	2026-06-28	3	7500.00	\N	f	5k paid	2026-06-23 02:40:05.589016	2026-06-27 16:35:28.431	\N	\N	confirmed	2026-06-26	Gcash Pat	\N	none	\N	\N	\N
141	1	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Queen Segunial Laguna	\N	\N	2026-07-05	2026-09-03	60	150000.00	\N	f	\N	2026-07-18 02:50:47.926217	2026-07-18 02:50:47.926217	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
127	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-06-25	2026-06-26	1	2500.00	\N	f	\N	2026-06-27 01:20:19.644152	2026-06-28 17:26:45.87	\N	\N	confirmed	2026-06-29	Gcash Pat	\N	none	\N	\N	\N
121	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-06-22	2026-06-25	3	7500.00	\N	f	\N	2026-06-23 02:39:06.305849	2026-06-28 17:27:53.977	\N	\N	confirmed	2026-06-29	Gcash Pat	\N	none	\N	\N	\N
123	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Anj Ocampo	\N	\N	2026-06-26	2026-06-28	2	5000.00	\N	f	\N	2026-06-24 01:47:32.112887	2026-06-28 17:28:03.32	\N	\N	confirmed	2026-06-29	Cash	\N	none	\N	\N	\N
128	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	John Arvin	\N	\N	2026-06-27	2026-06-29	2	5000.00	\N	f	\N	2026-06-27 01:20:48.037524	2026-06-29 17:51:00.64	\N	\N	confirmed	2026-06-30	Gcash Pat	\N	none	\N	\N	\N
129	5	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Erlord norway	\N	\N	2026-06-26	2026-07-01	5	12500.00	\N	f	\N	2026-06-27 01:23:12.298713	2026-06-30 16:10:26.358	\N	\N	confirmed	2026-07-01	BPI	\N	none	\N	\N	\N
113	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	John kyle Return client	\N	\N	2026-06-10	2026-06-24	14	25000.00	\N	f	18000 paid	2026-06-11 01:20:37.628281	2026-07-02 14:05:35.341	\N	\N	confirmed	2026-07-02	Cash	\N	none	\N	\N	\N
120	6	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Darell Consignado	\N	\N	2026-06-19	2026-07-19	30	50000.00	\N	f	\N	2026-06-19 11:58:28.150775	2026-07-09 02:57:28.625	\N	\N	confirmed	2026-06-19	Gcash Pat	\N	none	\N	\N	\N
135	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Patrica talavera	\N	\N	2026-07-10	2026-07-12	2	4000.00	\N	f	36hrs	2026-07-08 11:29:50.668762	2026-07-10 15:20:07.125	\N	\N	confirmed	2026-07-10	Cash	\N	none	\N	\N	\N
136	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Justin perlas	\N	\N	2026-07-11	2026-07-12	1	3200.00	\N	f	30hrs	2026-07-08 11:31:28.933316	2026-07-12 07:29:57.747	\N	\N	confirmed	2026-07-12	Cash	\N	none	\N	\N	\N
124	3	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Ara Johanna Old client Dubai	\N	\N	2026-07-13	2026-08-07	25	42000.00	\N	f	1900 per day	2026-06-24 03:50:51.488903	2026-07-14 14:06:53.523	\N	\N	confirmed	2026-07-14	BPI	\N	none	\N	\N	\N
138	8	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Indira BFRV	\N	\N	2026-07-12	2026-07-13	1	2500.00	\N	f	\N	2026-07-13 04:01:13.006722	2026-07-14 14:07:05.302	\N	\N	confirmed	2026-07-14	Cash	\N	none	\N	\N	\N
139	4	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Phoenix Las pinas 	\N	\N	2026-07-12	2026-07-13	1	1500.00	\N	f	12hrs	2026-07-13 04:02:15.801807	2026-07-14 14:07:31.975	\N	\N	confirmed	2026-07-14	Cash	\N	none	\N	\N	\N
137	9	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Teddy San jose	\N	\N	2026-07-08	2026-07-17	9	13500.00	\N	f	\N	2026-07-08 11:32:11.34679	2026-07-15 15:51:44.963	\N	\N	pending	\N	\N	\N	none	\N	\N	\N
140	2	27547d82-1b21-4dd0-8edb-c4f8f749bbab	Ej angeles	\N	\N	2026-07-17	2026-07-21	4	10000.00	\N	f	\N	2026-07-13 07:19:05.146402	2026-07-17 15:04:33.477	\N	\N	confirmed	2026-07-17	Gcash Pat	\N	none	\N	\N	\N
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
vwRy9cg93eLOF1NHyd7y3jaWAGesRIZ2	{"cookie": {"path": "/", "secure": true, "expires": "2026-07-16T04:03:37.780Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "2f4b02f7-6ba4-484d-87e3-d17ba3d717a7"}}	2026-07-22 19:45:17
XkeVXqQtnh8rK4Jcb9p2_GPRBlNXv0GU	{"cookie": {"path": "/", "secure": true, "expires": "2026-07-15T05:08:29.229Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "27547d82-1b21-4dd0-8edb-c4f8f749bbab"}}	2026-07-22 04:53:37
oHXlpWVg5YY_w_V9bh7NN9rsJj5l4DXU	{"cookie": {"path": "/", "secure": true, "expires": "2026-07-22T09:49:01.982Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "27547d82-1b21-4dd0-8edb-c4f8f749bbab"}}	2026-07-25 10:14:21
t-VbNYybadScR9_Sc1cyPMymYkAxPbJZ	{"cookie": {"path": "/", "secure": true, "expires": "2026-07-23T14:43:21.697Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "2f4b02f7-6ba4-484d-87e3-d17ba3d717a7"}}	2026-07-24 17:23:37
RPpUMZ68srIjktfENM2yKnHwj_iwkbKS	{"cookie": {"path": "/", "secure": false, "expires": "2026-07-28T05:32:08.805Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "2f4b02f7-6ba4-484d-87e3-d17ba3d717a7"}}	2026-07-28 05:32:11
q-UkUwUpNPiT4XNm0erqcsn10enuV4Lb	{"cookie": {"path": "/", "secure": false, "expires": "2026-07-25T13:59:12.721Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": "2f4b02f7-6ba4-484d-87e3-d17ba3d717a7"}}	2026-07-25 14:01:18
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, is_admin, created_at, updated_at, username, password, is_approved, must_change_password) FROM stdin;
dca48173-8e13-4cc4-94f8-bfeca4d6a5b8	\N	Rex	Relacion	\N	t	2025-12-02 15:43:35.267883	2025-12-03 06:15:22.697	knowhere	24ed149fc4178437859c7cf33c07ed8b392cdd18bd639af44fbfae16457789fc196e51ed19013186c06c5424f3b68ab67ac671f58e5502d2b4a2b306b66d09ff.56a49e2aee66c94e927779316ac1502d	t	f
2f4b02f7-6ba4-484d-87e3-d17ba3d717a7	\N	Admin	User	\N	t	2025-12-02 09:42:13.534918	2025-12-02 09:42:13.534918	Admin	72da7e32456335b225066151394cbfa449f236f2de6c29a4fae72e9c831b5c0a8ab91682249d484969df69a27ad8b8cd4d94c771f146e2bb4191343190e23c0e.3eef30a0d4d7c6fef9827126dffb1752	t	f
27547d82-1b21-4dd0-8edb-c4f8f749bbab	\N	Denver 	Garcia 	\N	t	2025-12-02 16:38:44.208306	2026-05-08 15:48:44.978	berber	8f63fc55e9e8c805db26b54324483f8682bb474488f8da54ad2acf3d2320a133be6d680f1e94c56e7930c8d2a0a9802c030676966eb5e7a39a17b444ac69bd60.8d0e996d309242a1c3df43781ebd1825	t	f
\.


--
-- Name: cars_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cars_id_seq', 10, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, true);


--
-- Name: edit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.edit_logs_id_seq', 15, false);


--
-- Name: expense_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_logs_id_seq', 19, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 24, true);


--
-- Name: monthly_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.monthly_payments_id_seq', 1, false);


--
-- Name: rental_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rental_logs_id_seq', 459, false);


--
-- Name: rentals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rentals_id_seq', 141, true);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: cars cars_plate_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_plate_number_unique UNIQUE (plate_number);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: edit_logs edit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_pkey PRIMARY KEY (id);


--
-- Name: expense_logs expense_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_logs
    ADD CONSTRAINT expense_logs_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: monthly_payments monthly_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_payments
    ADD CONSTRAINT monthly_payments_pkey PRIMARY KEY (id);


--
-- Name: rental_logs rental_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_logs
    ADD CONSTRAINT rental_logs_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: edit_logs edit_logs_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: edit_logs edit_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expense_logs expense_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_logs
    ADD CONSTRAINT expense_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: monthly_payments monthly_payments_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_payments
    ADD CONSTRAINT monthly_payments_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: rental_logs rental_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_logs
    ADD CONSTRAINT rental_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rentals rentals_car_id_cars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_car_id_cars_id_fk FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: rentals rentals_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: rentals rentals_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 3W9GTm4ECKnFo6nvCVeye7JiJq549fwGS4pH6PoSskchHWMbdeJkRE1JBP6pkMl

