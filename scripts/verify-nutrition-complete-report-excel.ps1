param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot "../evidence/nutrition-chat"), [switch]$PlanOnlyExport)
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
  $taskPlan = $taskBook.Worksheets.Item('Thuc don')
  Check-Number $taskInput.Range('Q7').Value2 241 'catalogue index exceeds custom source capacity'
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
  if($taskPlan.Range('A6').Value2 -ne 'Ngày' -or $taskPlan.Range('B6').Value2 -ne 'Bữa') {throw 'Plan day/meal not separated'}
  if($taskPlan.Range('A7').Value2 -ne 'Ngày 1' -or $taskPlan.Range('B7').Value2 -ne 'Trưa') {throw 'Plan day/meal data shifted'}
  Check-Number $taskPlan.Range('G7').Font.Size 15 'plan uses 15 pt text'
  Check-Number $taskPlan.Range('G7').Value2 260 'plan energy follows source data'
  Check-Number $taskPlan.Range('J8').Value2 0 'plan real zero retained'
  if($taskPlan.Range('G7').WrapText -or $taskPlan.Range('G7').ShrinkToFit) {throw 'Plan numeric text wraps or shrinks'}
  if(-not $taskPlan.Range('E7').Locked -or $taskInput.Range('G7').Locked) {throw 'Plan/input editing ownership changed'}
  $taskPlan.Activate()
  if(-not $taskBook.Windows.Item(1).DisplayGridlines) {throw 'Plan gridlines hidden'}
  $taskChecks.Add(@{check='plan distinct columns, normal grid and input ownership';pass=$true})
  if([string]$taskPlan.Range('A8').Value2 -ne '' -or [string]$taskPlan.Range('A9').Value2 -ne '' -or [string]$taskPlan.Range('C8').Value2 -ne '') {throw 'Plan repeats consecutive day/dish labels'}
  if($taskPlan.Range('A10').Value2 -ne 'Ngày 2' -or $taskPlan.Range('C9').Value2 -ne 'Sữa') {throw 'Plan omitted a new group label'}
  $taskChecks.Add(@{check='day and dish shown only at group start';pass=$true})
  $taskInput.Range('C8').Value2 = 'Tối'; $taskExcel.CalculateFullRebuild()
  if($taskPlan.Range('C8').Value2 -ne 'Cơm với thịt' -or [string]$taskPlan.Range('A8').Value2 -ne '') {throw 'New meal did not reset the dish label'}
  $taskChecks.Add(@{check='editing meal resets dish group';pass=$true})
  $taskInput.Range('C8').Value2 = 'Trưa'; $taskInput.Range('B8').Value2 = 2; $taskExcel.CalculateFullRebuild()
  if($taskPlan.Range('A8').Value2 -ne 'Ngày 2' -or $taskPlan.Range('C8').Value2 -ne 'Cơm với thịt') {throw 'New day did not reset group labels'}
  $taskChecks.Add(@{check='editing day resets day and dish groups';pass=$true})
  $taskInput.Range('B8').Value2 = 1; $taskExcel.CalculateFullRebuild()
  if([string]$taskPlan.Range('C8').Value2 -ne '' -or $taskInput.Range('D8').Value2 -ne 'Cơm với thịt') {throw 'Grouping removed the input dish label'}
  $taskChecks.Add(@{check='group display preserves repeated input labels';pass=$true})
  $taskInput.Range('G7').Value2 = 300; $taskInput.Range('I7').Value2 = 2
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskReport.Cells.Item($taskEnergyRow,3).Value2 1180 'report recalculates quantity and servings'
  Check-Number $taskReport.Cells.Item($taskDRow,3).Value2 18 'vitamin D recalculates quantity and servings'
  Check-Number $taskPlan.Range('E7').Value2 600 'plan total quantity includes servings'
  Check-Number $taskPlan.Range('G7').Value2 780 'plan energy includes same servings'
  Check-Number $taskPlan.Range('H7').Value2 15 'plan protein recalculates'
  Check-Number $taskPlan.Range('J7').Value2 168 'plan carbohydrate recalculates'
  if($taskReport.Range('A5').Value2 -notlike 'Đã sửa Excel*') {throw 'Stale report notice failed'}
  $taskChecks.Add(@{check='dirty notice refreshes';pass=$true})
  $taskInput.Range('G7').Value2 = 0
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskPlan.Range('G7').Value2 0 'plan zero quantity means zero energy'
  $taskInput.Range('G7').ClearContents()
  $taskExcel.CalculateFullRebuild()
  if($taskPlan.Range('E7').Value2 -ne '—' -or $taskPlan.Range('G7').Value2 -ne '—') {throw 'Missing plan quantity became zero'}
  $taskChecks.Add(@{check='missing quantity stays unavailable';pass=$true})
  $taskInput.Range('G7').Value2 = 200; $taskInput.Range('I7').Value2 = 1
  $taskInput.Range('E7').Value2 = 'test-no-waste'
  $taskExcel.CalculateFullRebuild()
  $taskShopping = $taskBook.Worksheets.Item('Di cho')
  if($taskShopping.Range('B7').Value2 -ne 'test-no-waste') {throw 'New shopping food is hidden or stale'}
  Check-Number $taskShopping.Range('E7').Value2 200 'shopping follows food ID outside original selection'
  Check-Number $taskShopping.Range('H7').Value2 1 'unknown waste remains flagged in shopping'
  $taskInput.Range('E7').Value2 = 'test-rice-a'
  $taskInput.Range('G9').Value2 = 400
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskPlan.Range('E9').Value2 400 'plan ml quantity retained'
  Check-Number $taskPlan.Range('G9').Value2 200 'plan portion source recalculates'
  if($taskPlan.Range('F9').Value2 -ne 'ml') {throw 'Plan ml silently changed to g'}
  $taskInput.Range('G9').Value2 = 200
  $taskExcel.CalculateFullRebuild()
  Check-Number $taskBook.Worksheets.Item('Doi chieu').Range('F7').Value2 0.165 'complete comparison native ratio'
  if($taskBook.Worksheets.Item('Doi chieu').Range('A7').Value2 -ne 'Năng lượng') {throw 'Raw nutrient key shown instead of label'}

  foreach($taskSheet in $taskBook.Worksheets) {
    foreach($value in $taskSheet.UsedRange.Value2) {
      if($value -is [int] -and $value -ge -2146826300 -and $value -le -2146826240) {throw "Excel error $value in $($taskSheet.Name)"}
    }
  }
  $taskChecks.Add(@{check='all sheets native formula error scan';pass=$true})
  $taskPrintSheets = if($PlanOnlyExport){@('Thuc don')}else{@('Bao cao','Thuc don','Thanh phan day du','Dinh duong theo ngay','Nguon doi soat','Nhom thuc pham')}
  foreach($name in $taskPrintSheets) {
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
