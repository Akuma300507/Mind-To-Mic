import * as XLSX from 'xlsx';
import type { Participant, Topic, AppDatabase, CustomFieldDefinition } from '../types';

export const excelService = {
  // Generate & download participant template
  downloadParticipantTemplate(customFields: CustomFieldDefinition[] = []) {
    const headers: Record<string, string> = {
      'Participant Number': 'M2M-007',
      'Full Name': 'John Doe',
      'College / Institution': 'State University',
      'Department / Branch': 'Engineering',
      'Status': 'active',
    };

    customFields.forEach((cf) => {
      headers[cf.name] = cf.type === 'checkbox' ? 'true' : cf.options?.[0] || 'Sample Value';
    });

    const ws = XLSX.utils.json_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants Template');
    XLSX.writeFile(wb, 'mind_to_mic_participants_template.xlsx');
  },

  // Parse uploaded participant excel file
  async parseParticipantsFile(file: File, customFields: CustomFieldDefinition[] = []): Promise<Partial<Participant>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          const participants: Partial<Participant>[] = rawRows.map((row, idx) => {
            // Find fields flexibly
            const name = row['Full Name'] || row['Name'] || row['Participant Name'] || row['name'] || `Contestant ${idx + 1}`;
            const participantNumber = row['Participant Number'] || row['Number'] || row['ID'] || row['participantNumber'] || `M2M-${String(idx + 1).padStart(3, '0')}`;
            const college = row['College / Institution'] || row['College'] || row['University'] || row['college'] || 'General College';
            const department = row['Department / Branch'] || row['Department'] || row['department'] || 'General';
            const status = (row['Status'] || row['status'] || 'active').toLowerCase();

            const customData: Record<string, any> = {};
            customFields.forEach((cf) => {
              if (row[cf.name] !== undefined) {
                let val = row[cf.name];
                if (cf.type === 'checkbox') {
                  val = String(val).toLowerCase() === 'true' || val === 1 || String(val).toLowerCase() === 'yes';
                }
                customData[cf.key] = val;
              }
            });

            return {
              name: String(name),
              participantNumber: String(participantNumber),
              college: String(college),
              department: String(department),
              status: ['active', 'registered', 'checked_in', 'eliminated', 'completed'].includes(status) ? status : 'active',
              round1Status: 'pending',
              round2Status: 'pending',
              round3Status: 'pending',
              customData,
            };
          });

          resolve(participants);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  // Download topic template
  downloadTopicTemplate() {
    const sample = [
      { 'Topic': 'Is Artificial Intelligence empowering or replacing human creativity?', 'Category': 'Technology' },
      { 'Topic': 'The Vanishing Art of Deep Conversation', 'Category': 'Culture' },
      { 'Topic': 'Why True Courage Requires Vulnerability', 'Category': 'Philosophy' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Topics Template');
    XLSX.writeFile(wb, 'mind_to_mic_topics_template.xlsx');
  },

  // Parse topics file
  async parseTopicsFile(file: File): Promise<{ topic: string; category?: string }[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          const topics = rawRows
            .map((row) => ({
              topic: String(row['Topic'] || row['topic'] || row['Title'] || '').trim(),
              category: String(row['Category'] || row['category'] || 'General').trim(),
            }))
            .filter((t) => t.topic.length > 0);

          resolve(topics);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  // Export full event report with multiple sheets
  exportFullEventReport(db: AppDatabase) {
    const wb = XLSX.utils.book_new();

    // 1. Participants Sheet
    const pRows = db.participants.map((p) => {
      const row: Record<string, any> = {
        'Participant ID': p.id,
        'Number': p.participantNumber,
        'Full Name': p.name,
        'College': p.college,
        'Department': p.department,
        'Status': p.status,
        'Round 1 Status': p.round1Status,
        'Round 2 Status': p.round2Status,
        'Round 3 Status': p.round3Status,
      };
      db.customFields.forEach((cf) => {
        row[cf.name] = p.customData?.[cf.key] ?? '';
      });
      return row;
    });
    const wsParticipants = XLSX.utils.json_to_sheet(pRows);
    XLSX.utils.book_append_sheet(wb, wsParticipants, 'Participants');

    // 2. Topics Sheet
    const tRows = db.topics.map((t) => ({
      'Topic ID': t.id,
      'Topic': t.topic,
      'Category': t.category || 'General',
      'Status': t.status,
      'Used By Participant': t.usedByParticipantName || '',
      'Used At': t.usedAt || '',
    }));
    const wsTopics = XLSX.utils.json_to_sheet(tRows);
    XLSX.utils.book_append_sheet(wb, wsTopics, 'Topics');

    // 3. Round 1 Results Sheet
    const r1Rows = db.round1Results.map((r) => ({
      'Result ID': r.id,
      'Participant Name': r.participantName,
      'College': r.college,
      'Image Name': r.imageName,
      'Prep Duration (s)': r.prepDurationSeconds,
      'Speech Duration (s)': r.speechDurationSeconds,
      'Status': r.status,
      'Start Time': r.startTime,
      'End Time': r.endTime,
      'Notes': r.notes || '',
    }));
    const wsR1 = XLSX.utils.json_to_sheet(r1Rows.length ? r1Rows : [{ 'Info': 'No Round 1 results recorded yet' }]);
    XLSX.utils.book_append_sheet(wb, wsR1, 'Round 1 Results');

    // 4. Round 2 Results Sheet
    const r2Rows = db.round2Results.map((r) => ({
      'Result ID': r.id,
      'Participant Name': r.participantName,
      'College': r.college,
      'Topic': r.topic,
      'Prep Duration (s)': r.prepDurationSeconds,
      'Speech Duration (s)': r.speechDurationSeconds,
      'Status': r.status,
      'Start Time': r.startTime,
      'End Time': r.endTime,
      'Notes': r.notes || '',
    }));
    const wsR2 = XLSX.utils.json_to_sheet(r2Rows.length ? r2Rows : [{ 'Info': 'No Round 2 results recorded yet' }]);
    XLSX.utils.book_append_sheet(wb, wsR2, 'Round 2 Results');

    // 5. Round 3 Results Sheet
    const r3Rows = db.round3Results.map((r) => ({
      'Result ID': r.id,
      'Participant Name': r.participantName,
      'College': r.college,
      'Speech Duration (s)': r.speechDurationSeconds,
      'Status': r.status,
      'Start Time': r.startTime,
      'End Time': r.endTime,
      'Notes': r.notes || '',
    }));
    const wsR3 = XLSX.utils.json_to_sheet(r3Rows.length ? r3Rows : [{ 'Info': 'No Round 3 results recorded yet' }]);
    XLSX.utils.book_append_sheet(wb, wsR3, 'Round 3 Results');

    // 6. Settings Sheet
    const settingsRows = [
      { 'Setting': 'Event Name', 'Value': db.settings.event.name },
      { 'Setting': 'Tagline', 'Value': db.settings.event.tagline },
      { 'Setting': 'Round 1 Prep Time (s)', 'Value': db.settings.round1.prepTimeSeconds },
      { 'Setting': 'Round 1 Speech Time (s)', 'Value': db.settings.round1.speechTimeSeconds },
      { 'Setting': 'Round 2 Active Wheel Topics', 'Value': db.settings.round2.activeWheelTopicCount },
      { 'Setting': 'Round 2 Prep Time (s)', 'Value': db.settings.round2.prepTimeSeconds },
      { 'Setting': 'Round 2 Speech Time (s)', 'Value': db.settings.round2.speechTimeSeconds },
      { 'Setting': 'Round 3 Speech Time (s)', 'Value': db.settings.round3.speechTimeSeconds },
      { 'Setting': 'Buzzer Sound', 'Value': db.settings.buzzer.sound },
      { 'Setting': 'Buzzer Volume', 'Value': `${db.settings.buzzer.volume}%` },
    ];
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
    XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Mind_to_Mic_Event_Report_${timestamp}.xlsx`);
  },
};
