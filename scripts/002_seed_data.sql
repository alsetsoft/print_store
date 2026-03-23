-- Seed initial categories for bases
INSERT INTO base_categories (name, description) 
SELECT 'Футболки', 'Футболки різних розмірів та стилів'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Футболки');

INSERT INTO base_categories (name, description) 
SELECT 'Чашки', 'Керамічні та термо чашки'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Чашки');

INSERT INTO base_categories (name, description) 
SELECT 'Кепки', 'Бейсболки та кепки'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Кепки');

INSERT INTO base_categories (name, description) 
SELECT 'Чохли', 'Чохли для телефонів'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Чохли');

INSERT INTO base_categories (name, description) 
SELECT 'Сумки', 'Тканинні та шопери'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Сумки');

INSERT INTO base_categories (name, description) 
SELECT 'Пляшки', 'Термопляшки та пляшки для води'
WHERE NOT EXISTS (SELECT 1 FROM base_categories WHERE name = 'Пляшки');

-- Seed initial categories for prints
INSERT INTO print_categories (name, description) 
SELECT 'Мінімалізм', 'Мінімалістичні дизайни'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Мінімалізм');

INSERT INTO print_categories (name, description) 
SELECT 'Природа', 'Природні мотиви та пейзажі'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Природа');

INSERT INTO print_categories (name, description) 
SELECT 'Тварини', 'Зображення тварин'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Тварини');

INSERT INTO print_categories (name, description) 
SELECT 'Подарунки', 'Дизайни для подарунків'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Подарунки');

INSERT INTO print_categories (name, description) 
SELECT 'Написи', 'Текстові принти та цитати'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Написи');

INSERT INTO print_categories (name, description) 
SELECT 'Арт', 'Художні та креативні дизайни'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Арт');

INSERT INTO print_categories (name, description) 
SELECT 'Популярні', 'Найпопулярніші принти'
WHERE NOT EXISTS (SELECT 1 FROM print_categories WHERE name = 'Популярні');

-- Seed common colors
INSERT INTO colors (name, hex_code) 
SELECT 'Білий', '#FFFFFF'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Білий');

INSERT INTO colors (name, hex_code) 
SELECT 'Чорний', '#000000'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Чорний');

INSERT INTO colors (name, hex_code) 
SELECT 'Сірий', '#808080'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Сірий');

INSERT INTO colors (name, hex_code) 
SELECT 'Червоний', '#FF0000'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Червоний');

INSERT INTO colors (name, hex_code) 
SELECT 'Синій', '#0000FF'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Синій');

INSERT INTO colors (name, hex_code) 
SELECT 'Зелений', '#008000'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Зелений');

INSERT INTO colors (name, hex_code) 
SELECT 'Жовтий', '#FFFF00'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Жовтий');

INSERT INTO colors (name, hex_code) 
SELECT 'Рожевий', '#FFC0CB'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Рожевий');

INSERT INTO colors (name, hex_code) 
SELECT 'Бежевий', '#F5F5DC'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Бежевий');

INSERT INTO colors (name, hex_code) 
SELECT 'Темно-синій', '#000080'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Темно-синій');

-- Seed common sizes
INSERT INTO sizes (name, sort_order) 
SELECT 'XS', 1
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XS');

INSERT INTO sizes (name, sort_order) 
SELECT 'S', 2
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'S');

INSERT INTO sizes (name, sort_order) 
SELECT 'M', 3
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'M');

INSERT INTO sizes (name, sort_order) 
SELECT 'L', 4
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'L');

INSERT INTO sizes (name, sort_order) 
SELECT 'XL', 5
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XL');

INSERT INTO sizes (name, sort_order) 
SELECT 'XXL', 6
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XXL');

INSERT INTO sizes (name, sort_order) 
SELECT 'XXXL', 7
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XXXL');

INSERT INTO sizes (name, sort_order) 
SELECT 'One Size', 10
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'One Size');

INSERT INTO sizes (name, sort_order) 
SELECT '250 мл', 20
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '250 мл');

INSERT INTO sizes (name, sort_order) 
SELECT '350 мл', 21
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '350 мл');

INSERT INTO sizes (name, sort_order) 
SELECT '450 мл', 22
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '450 мл');

-- Seed common print areas
INSERT INTO areas (name, description, x1, x2, x3, x4) 
SELECT 'Спереду', 'Передня частина виробу', 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE name = 'Спереду');

INSERT INTO areas (name, description, x1, x2, x3, x4) 
SELECT 'Ззаду', 'Задня частина виробу', 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE name = 'Ззаду');

INSERT INTO areas (name, description, x1, x2, x3, x4) 
SELECT 'На рукаві', 'На рукаві (лівий/правий)', 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE name = 'На рукаві');

INSERT INTO areas (name, description, x1, x2, x3, x4) 
SELECT 'Повна площа', 'Друк на всій поверхні', 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE name = 'Повна площа');

INSERT INTO areas (name, description, x1, x2, x3, x4) 
SELECT 'Центр', 'Центральне розташування', 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE name = 'Центр');
