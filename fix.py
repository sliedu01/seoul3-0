import re

with open('c:/서울3.0/src/app/budget/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the missing h2
target = """      </Card>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />"""

replacement = """      </Card>

      {/* BOTTOM VIEW: 집행명세서 그리드 */}
      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />"""

content = content.replace(target, replacement)
# Also try CRLF just in case
target_crlf = target.replace('\n', '\r\n')
replacement_crlf = replacement.replace('\n', '\r\n')
content = content.replace(target_crlf, replacement_crlf)

with open('c:/서울3.0/src/app/budget/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
