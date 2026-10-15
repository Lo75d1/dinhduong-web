param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot "../evidence/nutrition-chat"))
$ErrorActionPreference = 'Stop'
$taskEvidence = [IO.Path]::GetFullPath($EvidenceDirectory)
$taskPath = Join-Path $taskEvidence 'complete-report-test.xlsx'
$taskExcel = $null; $taskBook = $null
$taskChecks = [Collections.Generic.List[object]]::new()
function Check-Number($actual, [double]$expected, [string]$name) {
  if ($null -eq $actual -or $actual -is [string] -or [Math]::Abs([double]$actual-$expected) -gt 0.000001) { throw "$name : expected $expected; got $actual" }
  $taskChecks.Add(@{check=$name;value=$actual;pass=$true})
}
try {
  $taskExcel = New-Object -ComObject Excel.Application
  $taskExcel.Visible = $false; $taskExcel.DisplayAlerts = $false; $taskExcel.AutomationSecurity = 3
  $taskBook = $taskExcel.Workbooks.Open($taskPath, 0, $false)
  $taskExcel.CalculateFullRebuild()
  $taskReport = $taskBook.Worksheets.Item('Bao cao')
  $taskInput = $taskBook.Worksheets.Item('Nhap khau phan')
  $taskEnergyRow = 0; $taskDRow = 0; $taskKRow = 0
  for($i=7;$i -le $taskReport.UsedRange.Rows.Count;$i++) {
    if($taskReport.Cells.Item($i,1).Value2 -eq 'Năng lượng' -and $taskReport.Cells.Item($i,2).Value2 -eq 'kcal') {$taskEnergyRow=$i}
    if($taskReport.Cells.Item($i,1).Value2 -eq 'Vitamin D') {$taskDRow=$i}
    if($taskReport.Cells.Item($i,1).Value2 -eq 'Vitamin K') {$taskKRow=$i}
  }
  Check-Number $taskReport.Cells.Item($taskEnergyRow,3).Value2 660 'report baseline kcal'
  Check-Number $taskReport.Cells.Item($taskEnergyRow,4).Value2 330 'report average kcal'
  Check-Number $taskReport.Cells.Item($taskEnergyRow,6).Value2 0.165 'report target ratio'
  Check-Number $taskReport.Cells.Item($taskDRow,3).Value2 6 'full vitamin D retained'
  Check-Number $taskReport.Cells.Item($taskKRow,3).Value2 0 'real zero retained'
  if($taskReport.Cells.Item($taskDRow,6).Value2 -ne '—') {throw 'Missing vitamin D target falsely assessed'}
  $taskChecks.Add(@{check='no target remains dash';pass=$true})
  $taskInput.Range('G7').Value2 = 300; $taskInput.Range('I7').Value2 = 2
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskReport.Cells.Item($taskEnergyRow,3).Value2 1180 'report recalculates quantity and servings'
  Check-Number $taskReport.Cells.Item($taskDRow,3).Value2 18 'vitamin D recalculates quantity and servings'
  Check-Number $taskBook.Worksheets.Item('Thuc don').Range('D7').Value2 300 'plan quantity linked'
  Check-Number $taskBook.Worksheets.Item('Thuc don').Range('F7').Value2 2 'plan servings linked'
  Check-Number $taskBook.Worksheets.Item('Thuc don').Range('G7').Value2 600 'plan edible amount linked'
  if($taskReport.Range('A5').Value2 -notlike 'Đã sửa Excel*') {throw 'Stale report notice failed'}
  $taskChecks.Add(@{check='dirty notice refreshes';pass=$true})
  $taskInput.Range('G7').Value2 = 200; $taskInput.Range('I7').Value2 = 1
  $taskInput.Range('E7').Value2 = 'test-no-waste'
  $taskExcel.CalculateFullRebuild()
  $taskShopping = $taskBook.Worksheets.Item('Di cho')
  if($taskShopping.Range('B7').Value2 -ne 'test-no-waste') {throw 'New shopping food is hidden or stale'}
  Check-Number $taskShopping.Range('E7').Value2 200 'shopping follows food ID outside original selection'
  Check-Number $taskShopping.Range('H7').Value2 1 'unknown waste remains flagged in shopping'
  $taskInput.Range('E7').Value2 = 'test-rice-a'
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskBook.Worksheets.Item('Doi chieu').Range('F7').Value2 0.165 'complete comparison native ratio'
  if($taskBook.Worksheets.Item('Doi chieu').Range('A7').Value2 -ne 'Năng lượng') {throw 'Raw nutrient key shown instead of label'}

  foreach($taskSheet in $taskBook.Worksheets) {
    foreach($value in $taskSheet.UsedRange.Value2) {
      if($value -is [int] -and $value -ge -2146826300 -and $value -le -2146826240) {throw "Excel error $value in $($taskSheet.Name)"}
    }
  }
  $taskChecks.Add(@{check='all sheets native formula error scan';pass=$true})
  foreach($name in @('Bao cao','Thuc don','Dinh duong theo ngay','Nguon doi soat','Nhom thuc pham')) {
    $taskSheet = $taskBook.Worksheets.Item($name)
    if($taskSheet.PageSetup.PaperSize -ne 9) {throw "Not A4: $name"}
    $taskSheet.ExportAsFixedFormat(0,(Join-Path $taskEvidence ($name.Replace(' ','-')+'-complete.pdf')),0,$true,$false)
    $taskChecks.Add(@{check="A4 export $name";pages=$taskSheet.PageSetup.Pages.Count;pass=$true})
  }
  $taskBook.Worksheets.Item('Bao cao').Activate()
  $taskBook.SaveAs((Join-Path $taskEvidence 'complete-report-native-verified.xlsx'),51)
  [IO.File]::WriteAllText((Join-Path $taskEvidence 'complete-native-checks.json'),($taskChecks|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
  $taskChecks | ConvertTo-Json -Depth 5
} finally {
  if($taskBook){$taskBook.Close($false)}
  if($taskExcel){$taskExcel.Quit();[Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskExcel)|Out-Null}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
