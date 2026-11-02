-- Replaces the first seeded notes with 13 starting requests posted by @itsdestin. Generated 2026-10-27T02:57:36.342Z.
DELETE FROM notes WHERE author_id = -1
  AND NOT EXISTS (SELECT 1 FROM votes WHERE votes.note_id = notes.id)
  AND NOT EXISTS (SELECT 1 FROM replies WHERE replies.note_id = notes.id)
  AND NOT EXISTS (SELECT 1 FROM fixed_confirms WHERE fixed_confirms.note_id = notes.id);
DELETE FROM users WHERE id = -1 AND NOT EXISTS (SELECT 1 FROM notes WHERE author_id = -1);
INSERT OR IGNORE INTO users (id, login, github_created, trusted, joined) VALUES (192376128, 'itsdestin', 1734727100000, 1, 1793069856342);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'office', 'documents', '["libreoffice-writer"]', '["Google Docs","Microsoft Word"]', 'Live co-editing in LibreOffice', 'Two people can''t type in the same document at once in the desktop app. Collabora and OnlyOffice can do it in a browser, but you have to run a server.', 192376128, 1793069856342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'documents' AND title = 'Live co-editing in LibreOffice' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'office', 'documents', '["libreoffice-writer"]', '["Microsoft Word"]', 'Word files that look exactly the same when opened in LibreOffice', 'Layouts, fonts and tables sometimes shift when a .docx from Word is opened, which makes it risky to swap for anything that goes to other people.', 192376128, 1793069855342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'documents' AND title = 'Word files that look exactly the same when opened in LibreOffice' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'office', 'spreadsheets', '["libreoffice-calc"]', '["Microsoft Excel"]', 'Excel files with macros and complex formulas that work unchanged', 'Simple spreadsheets open fine; ones that depend on Excel macros or newer formulas often break.', 192376128, 1793069854342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'spreadsheets' AND title = 'Excel files with macros and complex formulas that work unchanged' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'creative', 'photo-editing', '["gimp"]', '["Adobe Photoshop"]', 'Opening Photoshop (PSD) files with every layer and effect intact', 'Layers, text and effects from a .psd file can come through flattened or changed.', 192376128, 1793069853342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'photo-editing' AND title = 'Opening Photoshop (PSD) files with every layer and effect intact' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'creative', 'photo-editing', '["gimp"]', '["Adobe Photoshop"]', 'Built-in AI tools: generative fill and one-click background removal', 'Photoshop''s AI tools are the feature people miss most after switching.', 192376128, 1793069852342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'photo-editing' AND title = 'Built-in AI tools: generative fill and one-click background removal' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'wish', 'creative', 'video-editing', '[]', '["CapCut"]', 'Automatic captions and ready-made templates like CapCut has', 'Phone-first video makers want one tap for captions and styles. The open editors are more powerful but slower to learn.', 192376128, 1793069851342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'video-editing' AND title = 'Automatic captions and ready-made templates like CapCut has' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'files', 'cloud-storage', '["nextcloud"]', '["Dropbox","Google Drive"]', 'A setup anyone can do without technical skills', 'Dropbox and Google Drive start with a sign-up. Running your own takes a server and some know-how.', 192376128, 1793069850342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'cloud-storage' AND title = 'A setup anyone can do without technical skills' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'everyday', 'maps', '["organic-maps","osmand"]', '["Google Maps"]', 'Live traffic and how busy a place is, like Google Maps', 'Offline maps and directions work well; real-time traffic and busy-hours information are missing.', 192376128, 1793069849342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'maps' AND title = 'Live traffic and how busy a place is, like Google Maps' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'os', 'phone-os', '["grapheneos"]', '["Google Android"]', 'Banking and wallet apps that work without Google services', 'Some banking, payment and wallet apps refuse to run on phones without Google''s certification.', 192376128, 1793069848342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'phone-os' AND title = 'Banking and wallet apps that work without Google services' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'social', 'video-calls', '["jitsi-meet"]', '["Zoom"]', 'Big meetings (50+ people) that stay smooth like Zoom', 'Small calls work well; very large meetings need a lot of server power and careful setup.', 192376128, 1793069847342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'video-calls' AND title = 'Big meetings (50+ people) that stay smooth like Zoom' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'wish', 'everyday', 'smart-home', '[]', '["Amazon Alexa","Google Home"]', 'A voice assistant as good as Alexa or Google Home', 'Home Assistant runs the house, but talking to it as naturally as the closed assistants is still rough.', 192376128, 1793069846342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'smart-home' AND title = 'A voice assistant as good as Alexa or Google Home' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'wish', 'office', 'pdf', '[]', '["Adobe Acrobat"]', 'Editing the text inside a PDF as easily as in Acrobat', 'Merging, splitting and signing are covered; changing the words on a page is not.', 192376128, 1793069845342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'pdf' AND title = 'Editing the text inside a PDF as easily as in Acrobat' AND author_id = 192376128);
INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', 'creative', 'cad', '["freecad","librecad"]', '["AutoCAD"]', 'Opening and saving AutoCAD (DWG) files reliably', 'Most of the industry shares DWG files, which is a closed format. Open programs work around it with DXF, which loses detail.', 192376128, 1793069844342, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = 'cad' AND title = 'Opening and saving AutoCAD (DWG) files reliably' AND author_id = 192376128);
