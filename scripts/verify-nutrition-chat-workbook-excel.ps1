param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot '..\evidence\nutrition-chat'))
$ErrorActionPreference = 'Stop'
$taskEvidence = [System.IO.Path]::GetFullPath($EvidenceDirectory)
$taskInput = Join-Path $taskEvidence 'editable-workbook-test.xlsx'
if (-not (Test-Path -LiteralPath $taskInput)) { throw 'Run test-nutrition-chat-workbook.ts first.' }
$taskExcel = $null
$taskBook = $null
$taskReport = [System.Collections.Generic.List[object]]::new()
function Assert-Number([object]$Actual, [double]$Expected, [string]$Label) {
  if ($Actual -isnot [double] -and $Actual -isnot [int]) { throw "$Label expected numeric $Expected; got $Actual" }
  if ([Math]::Abs([double]$Actual - $Expected) -gt 0.0000001) { throw "$Label expected $Expected; got $Actual" }
  $taskReport.Add([ordered]@{ check = $Label; actual = $Actual; expected = $Expected; passed = $true })
}
function Assert-Blank([object]$Actual, [string]$Label) {
  if ($null -ne $Actual -and [string]$Actual -ne '') { throw "$Label expected blank; got $Actual" }
  $taskReport.Add([ordered]@{ check = $Label; actual = ''; expected = ''; passed = $true })
}
try {
  # A new hidden Excel instance owns only this disposable fixture. Never attach to a running user's instance.
  $taskExcel = New-Object -ComObject Excel.Application
  $taskExcel.Visible = $false
  $taskExcel.DisplayAlerts = $false
  $taskExcel.AutomationSecurity = 3
  $taskBook = $taskExcel.Workbooks.Open($taskInput, 0, $false)
  $taskExcel.CalculateFullRebuild()
  $taskAnalysis = $taskBook.Worksheets.Item('Phan tich')
  $taskRows = $taskBook.Worksheets.Item('Nhap khau phan')
  $taskCustom = $taskBook.Worksheets.Item('Tu nhap')
  $taskMeals = $taskBook.Worksheets.Item('Theo bua')
  $taskDishes = $taskBook.Worksheets.Item('Theo mon')
  $taskComparison = $taskBook.Worksheets.Item('Doi chieu')
  Assert-Number $taskAnalysis.Range('D7').Value2 460 'native baseline day 1 energy'
  Assert-Number $taskAnalysis.Range('D8').Value2 200 'native baseline day 2 energy'
  Assert-Number $taskAnalysis.Range('D98').Value2 660 'native baseline period energy'
  Assert-Number $taskAnalysis.Range('D99').Value2 330 'native average data days'
  Assert-Number $taskAnalysis.Range('L7').Value2 20 'native known calcium subtotal'
  Assert-Number $taskAnalysis.Range('M7').Value2 2 'native missing calcium count'
  Assert-Number $taskAnalysis.Range('L8').Value2 0 'native true zero retained'
  Assert-Blank $taskAnalysis.Range('N9').Value2 'empty day macro result is blank, not error'
  Assert-Number $taskMeals.Range('F7').Value2 360 'native meal aggregation'
  Assert-Number $taskDishes.Range('F7').Value2 360 'native dish aggregation'
  Assert-Number $taskComparison.Range('F7').Value2 0.165 'native target comparison'
  Assert-Blank $taskComparison.Range('F8').Value2 'missing calcium never assessed against target'
  $taskCharts = $taskAnalysis.ChartObjects()
  if ($taskCharts.Count -ne 2) { throw "Expected 2 native charts, found $($taskCharts.Count)" }
  $taskReport.Add([ordered]@{ check = 'native charts'; count = $taskCharts.Count; seriesFormula = $taskCharts.Item(1).Chart.SeriesCollection(1).Formula; passed = $true })
  $taskRows.Range('G7').Value2 = 300
  $taskRows.Range('I7').Value2 = 2
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('D7').Value2 980 'grams and servings update day'
  Assert-Number $taskAnalysis.Range('D98').Value2 1180 'grams and servings update period'
  if ($taskAnalysis.Range('A4').Value2 -notlike 'Đã sửa Excel*') { throw 'Dirty notice did not update.' }
  $taskRows.Range('G7').Value2 = 200
  $taskRows.Range('I7').Value2 = 1
  $taskRows.Range('E7').Value2 = 'test-rice-b'
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('D7').Value2 600 'stable ID selector disambiguates duplicate name'
  Assert-Number $taskRows.Range('AG7').Value2 0 'selector preserves canonical true zero'
  $taskRows.Range('E7').Value2 = 'test-rice-a'
  $taskRows.Range('G7').Value2 = 0
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskRows.Range('AC7').Value2 0 'zero quantity calculates zero'
  Assert-Number $taskAnalysis.Range('D7').Value2 200 'zero quantity aggregate'
  $taskRows.Range('G8').Value2 = 0
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskRows.Range('AG8').Value2 0 'zero amount contributes zero despite missing source nutrient'
  Assert-Number $taskAnalysis.Range('M7').Value2 1 'zero amount is not counted as missing nutrient'
  $taskRows.Range('G8').Value2 = 50
  $taskRows.Range('G7').Value2 = 200
  $taskRows.Range('J8').Value2 = 'raw'
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskRows.Range('W8').Value2 45 'raw food waste conversion'
  Assert-Number $taskRows.Range('Y8').Value2 50 'raw food shopping conversion'
  Assert-Number $taskAnalysis.Range('D7').Value2 450 'raw conversion energy'
  $taskRows.Range('E8').Value2 = 'test-no-waste'
  $taskExcel.CalculateFullRebuild()
  Assert-Blank $taskRows.Range('W8').Value2 'unknown waste remains unknown'
  Assert-Blank $taskRows.Range('AC8').Value2 'unknown conversion does not calculate kcal'
  Assert-Number $taskAnalysis.Range('D7').Value2 360 'partial energy retained'
  Assert-Number $taskAnalysis.Range('E7').Value2 1 'missing energy counted'
  Assert-Blank $taskAnalysis.Range('N7').Value2 'incomplete macro percentage suppressed'
  $taskRows.Range('E8').Value2 = 'test-beef'
  $taskRows.Range('J8').Value2 = 'edible'
  $taskCustom.Range('H7').Value2 = 100
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskRows.Range('AC9').Value2 200 'editable label portion denominator'
  Assert-Number $taskAnalysis.Range('D7').Value2 560 'label edits update totals'
  Assert-Blank $taskRows.Range('X9').Value2 'ml not silently treated as grams'
  $taskRows.Range('M9').Value2 = 1.03
  $taskRows.Range('N9').Value2 = 'Mật độ giả lập; chỉ kiểm thử'
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskRows.Range('X9').Value2 206 'explicit density converts ml to grams'
  $taskRows.Range('M9').ClearContents()
  $taskRows.Range('N9').ClearContents()
  $taskCustom.Range('H7').Value2 = 200
  $taskCustom.Range('G7').Value2 = '100g'
  $taskRows.Range('H9').Value2 = 'g'
  $taskCustom.Range('M7').Value2 = 90
  $taskCustom.Range('N7').Value2 = 40
  $taskCustom.Range('O7').Value2 = 30
  $taskExcel.CalculateFullRebuild()
  Assert-Blank $taskRows.Range('AC9').Value2 'impossible custom macro sum is excluded'
  Assert-Number $taskAnalysis.Range('E7').Value2 1 'invalid custom macro is counted missing'
  $taskCustom.Range('G7').Value2 = 'portion'
  $taskRows.Range('H9').Value2 = 'ml'
  $taskCustom.Range('M7').Value2 = 6
  $taskCustom.Range('N7').Value2 = 4
  $taskCustom.Range('O7').Value2 = 10
  $taskTargets = $taskBook.Worksheets.Item('Ngay va muc tieu')
  $taskTargets.Range('F7').Value2 = 0
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('Q7').Value2 0 'zero target remains zero'
  Assert-Blank $taskAnalysis.Range('R7').Value2 'zero target has no division error'
  $taskTargets.Range('F7').Value2 = 2000
  $taskTargets.Range('C9').Value2 = 'Ngày 3 thử nghiệm'
  $taskTargets.Range('D9').Value2 = '2026-10-16'
  $taskRows.Range('B7').Value2 = 3
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('D9').Value2 260 'added day computes automatically'
  $taskExpandedSeries = @($taskCharts.Item(1).Chart.SeriesCollection(1).Values)
  Assert-Number $taskExpandedSeries.Count 3 'native chart series grows with added day'
  $taskTargets.Range('C9').ClearContents()
  $taskTargets.Range('D9').ClearContents()
  $taskRows.Range('B7').Value2 = 2
  $taskRows.Range('C7').Value2 = 'Tối'
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('D7').Value2 200 'move row removes energy from old day'
  Assert-Number $taskAnalysis.Range('D8').Value2 460 'move row adds energy to new day'
  Assert-Number $taskMeals.Range('F7').Value2 260 'meal rename and day move refresh group'
  $taskRows.Range('B7').Value2 = 1
  $taskRows.Range('C7').Value2 = 'Trưa'
  $taskExcel.CalculateFullRebuild()
  Assert-Number $taskAnalysis.Range('D7').Value2 460 'restored baseline'
  if ($taskAnalysis.Range('A4').Value2 -notlike 'Chưa sửa đầu vào*') { throw 'Restored inputs still reported dirty.' }
  # Excel error-valued cells are integers in COM Value2; SpecialCells identifies native formula errors.
  foreach ($taskSheet in $taskBook.Worksheets) {
    $taskNativeValues = $taskSheet.UsedRange.Value2
    foreach ($taskNativeValue in $taskNativeValues) {
      if ($taskNativeValue -is [int] -and $taskNativeValue -ge -2146826300 -and $taskNativeValue -le -2146826240) { throw "Native Excel error value $taskNativeValue on $($taskSheet.Name)." }
    }
  }
  $taskAnalysis.PageSetup.PrintArea = 'A108:L123'
  $taskAnalysis.ExportAsFixedFormat(0, (Join-Path $taskEvidence 'native-charts-preview.pdf'))
  $taskAnalysis.PageSetup.PrintArea = 'A1:S18'
  $taskAnalysis.ExportAsFixedFormat(0, (Join-Path $taskEvidence 'native-analysis-preview.pdf'))
  foreach ($taskName in @('Doi chieu','Ngay va muc tieu','Nhap khau phan','Theo bua','Theo mon','Di cho','Tu nhap','Du lieu')) {
    $taskPreview = $taskBook.Worksheets.Item($taskName)
    $taskPreview.PageSetup.PrintArea = switch ($taskName) {
      'Nhap khau phan' { 'A1:P12' }
      'Tu nhap' { 'A1:P12' }
      'Du lieu' { 'A1:N12' }
      default { 'A1:J14' }
    }
    $taskPreview.ExportAsFixedFormat(0, (Join-Path $taskEvidence ($taskName.Replace(' ','-') + '-preview.pdf')))
  }
  $taskBook.SaveAs((Join-Path $taskEvidence 'editable-workbook-native-verified.xlsx'), 51)
  [System.IO.File]::WriteAllText((Join-Path $taskEvidence 'native-excel-verification.json'), ($taskReport | ConvertTo-Json -Depth 6), [System.Text.UTF8Encoding]::new($false))
  $taskReport | ConvertTo-Json -Depth 6
} finally {
  if ($null -ne $taskBook) { $taskBook.Close($false) }
  if ($null -ne $taskExcel) { $taskExcel.Quit(); [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskExcel) | Out-Null }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
