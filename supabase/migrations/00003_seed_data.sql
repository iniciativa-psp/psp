-- =============================================================================
-- Datos semilla – Conceptos de pago iniciales
-- =============================================================================

INSERT INTO payment_concepts (name, description, amount, currency, is_active)
VALUES
    ('Cuota mensual básica',      'Cuota mensual de membresía al programa',               10.00, 'USD', TRUE),
    ('Capacitación emprendedora', 'Inscripción a taller de emprendimiento',               25.00, 'USD', TRUE),
    ('Fondo solidario',           'Contribución al fondo solidario comunitario',           5.00, 'USD', TRUE),
    ('Registro de beneficiario',  'Pago único de registro como beneficiario del programa', 0.00, 'USD', TRUE)
ON CONFLICT DO NOTHING;
