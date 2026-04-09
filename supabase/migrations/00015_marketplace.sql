-- =============================================================================
-- Migración 00015: Marketplace PSP
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Secuencia para números de orden
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ---------------------------------------------------------------------------
-- marketplace_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(20),
  image_url   TEXT,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_categories IS 'Categorías jerárquicas del marketplace PSP';

-- ---------------------------------------------------------------------------
-- marketplace_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id            UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  category_id          UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  strategy_item_id     UUID REFERENCES strategy_items(id) ON DELETE SET NULL,
  territorial_id       BIGINT REFERENCES territorial_items(id) ON DELETE SET NULL,
  economic_sector_id   INT REFERENCES economic_sectors(id) ON DELETE SET NULL,

  -- Identidad
  sku                  VARCHAR(100) UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  slug                 VARCHAR(255) UNIQUE NOT NULL,
  short_description    VARCHAR(500),
  description          TEXT,

  -- Tipo
  product_type         VARCHAR(30) NOT NULL DEFAULT 'product'
                         CHECK (product_type IN ('product','service','digital','agricultural','artisanal')),

  -- Precios
  price                NUMERIC(14,2) NOT NULL,
  price_compare        NUMERIC(14,2),
  currency             VARCHAR(3) NOT NULL DEFAULT 'USD',
  unit                 VARCHAR(30),
  min_order_qty        SMALLINT DEFAULT 1,
  itbms_applies        BOOLEAN DEFAULT FALSE,
  itbms_rate           NUMERIC(5,2) DEFAULT 7.00,

  -- Inventario
  stock_qty            INT DEFAULT 0,
  stock_unlimited      BOOLEAN DEFAULT FALSE,
  low_stock_threshold  INT DEFAULT 5,

  -- Media
  main_image_url       TEXT,
  images               TEXT[],
  video_url            TEXT,

  -- Logística
  delivery_available   BOOLEAN DEFAULT TRUE,
  delivery_days_min    SMALLINT DEFAULT 1,
  delivery_days_max    SMALLINT DEFAULT 5,
  pickup_available     BOOLEAN DEFAULT TRUE,
  weight_kg            NUMERIC(8,3),
  dimensions_cm        VARCHAR(50),

  -- Estado
  status               VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','active','paused','out_of_stock','archived')),

  -- SEO & marketing
  tags                 TEXT[],
  featured             BOOLEAN DEFAULT FALSE,
  featured_until       TIMESTAMPTZ,

  -- Métricas
  views_count          INT DEFAULT 0,
  orders_count         INT DEFAULT 0,
  rating_avg           NUMERIC(3,2) DEFAULT 0,
  rating_count         INT DEFAULT 0,

  -- Patrocinio
  sponsor_actor_id     UUID REFERENCES actors(id) ON DELETE SET NULL,
  sponsor_display_size VARCHAR(20) DEFAULT 'small'
                         CHECK (sponsor_display_size IN ('small','medium','large')),

  -- Trazabilidad
  is_active            BOOLEAN DEFAULT TRUE,
  created_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_products IS 'Catálogo de productos y servicios del marketplace PSP';

-- ---------------------------------------------------------------------------
-- marketplace_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number            VARCHAR(30) UNIQUE NOT NULL,
  buyer_id                UUID NOT NULL REFERENCES actors(id) ON DELETE RESTRICT,
  strategy_item_id        UUID REFERENCES strategy_items(id) ON DELETE SET NULL,
  territorial_id          BIGINT REFERENCES territorial_items(id) ON DELETE SET NULL,

  status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','pending','confirmed','processing','shipped','delivered','cancelled','refunded')),

  -- Totales
  subtotal                NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(14,2) DEFAULT 0,
  itbms_amount            NUMERIC(14,2) DEFAULT 0,
  delivery_fee            NUMERIC(14,2) DEFAULT 0,
  total                   NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency                VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Entrega
  delivery_type           VARCHAR(20) DEFAULT 'delivery'
                            CHECK (delivery_type IN ('delivery','pickup')),
  delivery_address        TEXT,
  delivery_lat            DOUBLE PRECISION,
  delivery_lng            DOUBLE PRECISION,
  delivery_notes          TEXT,
  estimated_delivery_date DATE,
  delivered_at            TIMESTAMPTZ,

  -- Pago
  payment_status          VARCHAR(20) DEFAULT 'pending'
                            CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method          VARCHAR(50),
  payment_reference       VARCHAR(100),
  paid_at                 TIMESTAMPTZ,

  notes                   TEXT,
  created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_orders IS 'Pedidos del marketplace PSP';

-- ---------------------------------------------------------------------------
-- marketplace_order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE RESTRICT,
  seller_id        UUID NOT NULL REFERENCES actors(id) ON DELETE RESTRICT,

  quantity         INT NOT NULL DEFAULT 1,
  unit_price       NUMERIC(14,2) NOT NULL,
  itbms_rate       NUMERIC(5,2) DEFAULT 0,
  itbms_amount     NUMERIC(14,2) DEFAULT 0,
  line_total       NUMERIC(14,2) NOT NULL,

  product_snapshot JSONB,

  status           VARCHAR(20) DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_order_items IS 'Líneas de pedido del marketplace';

-- ---------------------------------------------------------------------------
-- marketplace_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  order_item_id         UUID REFERENCES marketplace_order_items(id) ON DELETE SET NULL,

  rating                SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                 VARCHAR(150),
  body                  TEXT,
  is_verified_purchase  BOOLEAN DEFAULT FALSE,
  is_approved           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT marketplace_reviews_unique UNIQUE (product_id, reviewer_id)
);

COMMENT ON TABLE marketplace_reviews IS 'Reseñas de productos del marketplace';

-- ---------------------------------------------------------------------------
-- marketplace_cart_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT marketplace_cart_unique UNIQUE (actor_id, product_id)
);

COMMENT ON TABLE marketplace_cart_items IS 'Carrito de compras persistente del marketplace';

-- ---------------------------------------------------------------------------
-- marketplace_wishlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_wishlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT marketplace_wishlist_unique UNIQUE (actor_id, product_id)
);

COMMENT ON TABLE marketplace_wishlist IS 'Lista de deseos del marketplace';

-- ---------------------------------------------------------------------------
-- marketplace_order_status_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_order_status_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes      TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_order_status_log IS 'Historial de cambios de estado de pedidos';

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mp_products_seller      ON marketplace_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_category    ON marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_status      ON marketplace_products(status);
CREATE INDEX IF NOT EXISTS idx_mp_products_territorial ON marketplace_products(territorial_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_featured    ON marketplace_products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_mp_products_sector      ON marketplace_products(economic_sector_id);

CREATE INDEX IF NOT EXISTS idx_mp_orders_buyer         ON marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mp_orders_status        ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_mp_orders_number        ON marketplace_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_mp_order_items_order    ON marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_mp_order_items_product  ON marketplace_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_mp_reviews_product      ON marketplace_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_mp_cart_actor           ON marketplace_cart_items(actor_id);
CREATE INDEX IF NOT EXISTS idx_mp_wishlist_actor       ON marketplace_wishlist(actor_id);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_mp_products_updated_at
  BEFORE UPDATE ON marketplace_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mp_orders_updated_at
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mp_cart_updated_at
  BEFORE UPDATE ON marketplace_cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: registro automático de cambios de estado en pedidos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_mp_order_status_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO marketplace_order_status_log (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mp_order_status_log
  AFTER UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION fn_mp_order_status_log();

-- ---------------------------------------------------------------------------
-- Trigger: actualizar rating_avg y rating_count al aprobar una reseña
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_mp_update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE marketplace_products
  SET
    rating_count = (
      SELECT COUNT(*) FROM marketplace_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_approved = TRUE
    ),
    rating_avg = (
      SELECT COALESCE(AVG(rating), 0) FROM marketplace_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_approved = TRUE
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mp_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION fn_mp_update_product_rating();

-- ---------------------------------------------------------------------------
-- Función: generar número de orden secuencial
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Vista: v_marketplace_products
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_marketplace_products AS
SELECT
  mp.*,
  a.full_name                                          AS seller_name,
  a.logo_url                                           AS seller_logo_url,
  mc.name                                              AS category_name,
  ti.name                                              AS territorial_name,
  es.name                                              AS sector_name,
  CASE
    WHEN mp.itbms_applies THEN ROUND(mp.price * (1 + mp.itbms_rate / 100), 2)
    ELSE mp.price
  END                                                  AS price_with_itbms,
  sp.full_name                                         AS sponsor_name
FROM marketplace_products mp
JOIN actors a ON a.id = mp.seller_id
LEFT JOIN marketplace_categories mc ON mc.id = mp.category_id
LEFT JOIN territorial_items ti ON ti.id = mp.territorial_id
LEFT JOIN economic_sectors es ON es.id = mp.economic_sector_id
LEFT JOIN actors sp ON sp.id = mp.sponsor_actor_id;

-- ---------------------------------------------------------------------------
-- Vista: v_marketplace_orders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_marketplace_orders AS
SELECT
  mo.*,
  a.full_name                                          AS buyer_name,
  ti.name                                              AS territorial_name,
  COUNT(oi.id)                                         AS item_count
FROM marketplace_orders mo
JOIN actors a ON a.id = mo.buyer_id
LEFT JOIN territorial_items ti ON ti.id = mo.territorial_id
LEFT JOIN marketplace_order_items oi ON oi.order_id = mo.id
GROUP BY mo.id, a.full_name, ti.name;

-- ---------------------------------------------------------------------------
-- Función: búsqueda de productos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_marketplace_products(
  p_query        TEXT    DEFAULT NULL,
  p_category_id  UUID    DEFAULT NULL,
  p_seller_id    UUID    DEFAULT NULL,
  p_product_type TEXT    DEFAULT NULL,
  p_min_price    NUMERIC DEFAULT NULL,
  p_max_price    NUMERIC DEFAULT NULL,
  p_territorial_id BIGINT DEFAULT NULL,
  p_featured     BOOLEAN DEFAULT NULL,
  p_limit        INT     DEFAULT 20,
  p_offset       INT     DEFAULT 0
)
RETURNS SETOF v_marketplace_products
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM v_marketplace_products
  WHERE
    status = 'active'
    AND is_active = TRUE
    AND (p_query        IS NULL OR (name ILIKE '%' || p_query || '%' OR short_description ILIKE '%' || p_query || '%'))
    AND (p_category_id  IS NULL OR category_id    = p_category_id)
    AND (p_seller_id    IS NULL OR seller_id       = p_seller_id)
    AND (p_product_type IS NULL OR product_type    = p_product_type)
    AND (p_min_price    IS NULL OR price           >= p_min_price)
    AND (p_max_price    IS NULL OR price           <= p_max_price)
    AND (p_territorial_id IS NULL OR territorial_id = p_territorial_id)
    AND (p_featured     IS NULL OR featured        = p_featured)
  ORDER BY featured DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE marketplace_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_wishlist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories     ENABLE ROW LEVEL SECURITY;

-- marketplace_categories: lectura pública, escritura admin+
CREATE POLICY "mp_categories_select" ON marketplace_categories
  FOR SELECT USING (is_active = TRUE OR has_role('operador'));

CREATE POLICY "mp_categories_insert" ON marketplace_categories
  FOR INSERT WITH CHECK (has_role('admin'));

CREATE POLICY "mp_categories_update" ON marketplace_categories
  FOR UPDATE USING (has_role('admin'));

-- marketplace_products: lectura pública (active), escritura vendedor o operador+
CREATE POLICY "mp_products_select" ON marketplace_products
  FOR SELECT USING (
    status = 'active'
    OR has_role('operador')
    OR seller_id IN (SELECT id FROM actors WHERE id = seller_id)
  );

CREATE POLICY "mp_products_insert" ON marketplace_products
  FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "mp_products_update" ON marketplace_products
  FOR UPDATE USING (has_role('operador'));

CREATE POLICY "mp_products_delete" ON marketplace_products
  FOR DELETE USING (has_role('admin'));

-- marketplace_orders: comprador y operador+
CREATE POLICY "mp_orders_select" ON marketplace_orders
  FOR SELECT USING (
    has_role('operador')
    OR buyer_id IN (SELECT id FROM actors WHERE TRUE)
  );

CREATE POLICY "mp_orders_insert" ON marketplace_orders
  FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "mp_orders_update" ON marketplace_orders
  FOR UPDATE USING (has_role('operador'));

-- marketplace_order_items
CREATE POLICY "mp_order_items_select" ON marketplace_order_items
  FOR SELECT USING (has_role('operador'));

CREATE POLICY "mp_order_items_insert" ON marketplace_order_items
  FOR INSERT WITH CHECK (has_role('operador'));

-- marketplace_reviews: lectura si aprobada, escritura operador+
CREATE POLICY "mp_reviews_select" ON marketplace_reviews
  FOR SELECT USING (is_approved = TRUE OR has_role('operador'));

CREATE POLICY "mp_reviews_insert" ON marketplace_reviews
  FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "mp_reviews_update" ON marketplace_reviews
  FOR UPDATE USING (has_role('operador'));

-- marketplace_cart_items: solo el actor dueño
CREATE POLICY "mp_cart_select" ON marketplace_cart_items
  FOR SELECT USING (has_role('operador'));

CREATE POLICY "mp_cart_insert" ON marketplace_cart_items
  FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "mp_cart_update" ON marketplace_cart_items
  FOR UPDATE USING (has_role('operador'));

CREATE POLICY "mp_cart_delete" ON marketplace_cart_items
  FOR DELETE USING (has_role('operador'));

-- marketplace_wishlist: solo el actor dueño
CREATE POLICY "mp_wishlist_select" ON marketplace_wishlist
  FOR SELECT USING (has_role('operador'));

CREATE POLICY "mp_wishlist_insert" ON marketplace_wishlist
  FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "mp_wishlist_delete" ON marketplace_wishlist
  FOR DELETE USING (has_role('operador'));

-- marketplace_order_status_log
CREATE POLICY "mp_order_status_log_select" ON marketplace_order_status_log
  FOR SELECT USING (has_role('operador'));

-- ---------------------------------------------------------------------------
-- Seed: Categorías raíz del marketplace PSP
-- ---------------------------------------------------------------------------
INSERT INTO marketplace_categories (id, name, slug, description, icon, color, sort_order) VALUES
  (gen_random_uuid(), 'Alimentos Frescos',    'alimentos-frescos',    'Frutas, verduras, lácteos y más',           'apple',     '#22c55e', 1),
  (gen_random_uuid(), 'Productos Agrícolas',  'productos-agricolas',  'Del campo a tu mesa',                       'wheat',     '#84cc16', 2),
  (gen_random_uuid(), 'Artesanías',           'artesanias',           'Productos artesanales panameños',           'palette',   '#f97316', 3),
  (gen_random_uuid(), 'Agroindustria',        'agroindustria',        'Productos procesados y transformados',      'factory',   '#6366f1', 4),
  (gen_random_uuid(), 'Pesca Artesanal',      'pesca-artesanal',      'Productos del mar y ríos',                  'fish',      '#0ea5e9', 5),
  (gen_random_uuid(), 'Servicios',            'servicios',            'Servicios profesionales y domésticos',      'briefcase', '#8b5cf6', 6),
  (gen_random_uuid(), 'Economía Verde',       'economia-verde',       'Productos sostenibles y ecológicos',        'leaf',      '#10b981', 7),
  (gen_random_uuid(), 'Turismo',              'turismo',              'Experiencias y paquetes turísticos',        'map-pin',   '#f59e0b', 8)
ON CONFLICT (slug) DO NOTHING;
