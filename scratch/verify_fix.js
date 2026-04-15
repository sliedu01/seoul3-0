const Q_CANDIDATES = [/설문문항/, /문항내용/, /문항/, /질문에대한내용/, /질문/, /content/i, /제목/, /구분/];

const getRowVal = (row, patterns) => {
    const keys = Object.keys(row);
    for (const p of patterns) {
        for (const key of keys) {
            const normalizedK = key.replace(/\s+/g, '').toLowerCase();
            if (p instanceof RegExp) {
                if (p.test(key) || p.test(normalizedK)) return row[key];
            } else {
                const normalizedP = p.replace(/\s+/g, '').toLowerCase();
                if (normalizedK.includes(normalizedP) || normalizedP.includes(normalizedK)) return row[key];
            }
        }
    }
    return undefined;
};

// Simulation of the user's Excel row data
const row = {
    "구분": "프로그램 전반 만족",
    "설문문항": "이번 진로체험 프로그램에 전반적으로 만족하시나요?",
    "응답인원(계)": 57,
    "5점(매우만족)": 46,
    "4점(만족)": 7,
    "3점(보통)": 4,
    "2점(불만족)": 0,
    "1점(매우불만족)": 0
};

console.log("Extracted Question Content:", getRowVal(row, Q_CANDIDATES));

// Before the fix, it would have returned "프로그램 전반 만족" because "구분" is the first key.
// After the fix, it should return "이번 진로체험 프로그램에 전반적으로 만족하시나요?" because /설문문항/ is a higher priority pattern.
