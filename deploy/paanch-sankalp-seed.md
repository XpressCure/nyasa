# पाँच प्रारम्भिक संकल्प Seed

This imports the five approved booklet Sankalp into the live Nyasa family workspace.

## What It Creates Or Updates

- इक्कीस पेड़ माँ के नाम
- नन्ही खुशियाँ, नए रिश्ते
- पैतृक गृह सुविधा उन्नयन
- अलहदादपुर भविष्य उद्यम खोज
- पारिवारिक धरोहर एवं संपत्ति सुरक्षा

Each Sankalp keeps the booklet essence: purpose, rules, budget state, target dates, team names, milestones, and an introductory progress note.

## Run On Server

```bash
cd ~/nyasa
git pull
npm install
npm run db:seed-paanch-sankalp
pm2 restart nyasa-api --update-env
```

After it runs, check the output. If any team names are marked as missing or ambiguous, create or merge the correct Sadasya profile and run the seed again. The script is idempotent, so it updates the same five Sankalp instead of creating fresh duplicates.

## Dashboard

The Darshan dashboard shows a “पाँच प्रारम्भिक संकल्प” section from live database records, so members can see the approved starting works before opening the full Sankalp page.
