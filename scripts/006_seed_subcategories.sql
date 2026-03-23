-- Seed base subcategories linked to categories
INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Чоловічі', id FROM base_categories WHERE name = 'Футболки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Чоловічі' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Футболки'));

INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Жіночі', id FROM base_categories WHERE name = 'Футболки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Жіночі' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Футболки'));

INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Дитячі', id FROM base_categories WHERE name = 'Футболки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Дитячі' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Футболки'));

INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Худі', id FROM base_categories WHERE name = 'Футболки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Худі' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Футболки'));

INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Керамічні', id FROM base_categories WHERE name = 'Чашки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Керамічні' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Чашки'));

INSERT INTO base_subcategories (name, base_category_id)
SELECT 'Термо', id FROM base_categories WHERE name = 'Чашки'
  AND NOT EXISTS (SELECT 1 FROM base_subcategories WHERE name = 'Термо' AND base_category_id = (SELECT id FROM base_categories WHERE name = 'Чашки'));
