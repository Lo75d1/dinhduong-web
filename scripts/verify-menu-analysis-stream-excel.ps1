param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot "../evidence/nutrition-chat"))
$taskEvidence=[IO.Path]::GetFullPath($EvidenceDirectory)
$ErrorActionPreference='Stop'
$taskExcel=$null;$taskBook=$null
function Assert-Value($actual,$expected,$name){if($actual -ne $expected){throw "$name expected $expected got $actual"}}
try{
  $taskExcel=New-Object -ComObject Excel.Application
  $taskExcel.Visible=$false;$taskExcel.DisplayAlerts=$false;$taskExcel.AutomationSecurity=3
  $taskBook=$taskExcel.Workbooks.Open((Join-Path $taskEvidence 'admin-stream-report-test.xlsx'),0,$false)
  $taskFoods=$taskBook.Worksheets.Item('Thuc_pham');$taskIngredients=$taskBook.Worksheets.Item('Nguyen_lieu_mon')
  Assert-Value $taskFoods.UsedRange.Rows.Count 3720 'all food rows'
  Assert-Value $taskFoods.UsedRange.Columns.Count 170 'all metadata and nutrient columns'
  Assert-Value $taskFoods.Range('A3720').Value2 'stream-food-3718' 'last food'
  Assert-Value $taskIngredients.UsedRange.Rows.Count 41458 'all ingredient rows'
  Assert-Value $taskIngredients.Range('C41458').Value2 41456 'last ingredient'
  Assert-Value $taskFoods.Range('A2').Font.Name 'Times New Roman' 'plain report font'
  Assert-Value $taskFoods.PageSetup.PaperSize 9 'native A4 setting'
  $taskTemplate=$taskBook.Worksheets.Item('Khung_thuc_don')
  $taskTemplate.Range('D3').Value2='stream-food-0';$taskTemplate.Range('F3').Value2=100
  $taskExcel.CalculateFullRebuild()
  Assert-Value $taskTemplate.Range('G3').Value2 0 'native zero retained'
  $taskFoods.Range('I2').ClearContents();$taskExcel.CalculateFullRebuild()
  Assert-Value $taskTemplate.Range('G3').Value2 '' 'missing source not zero'
  $taskTemplate.Range('F3').Value2=0;$taskExcel.CalculateFullRebuild()
  Assert-Value $taskTemplate.Range('G3').Value2 0 'zero amount despite missing nutrient'
  $taskFoods.Range('I2').Value2=0;$taskFoods.Range('G2').Value2='ml';$taskTemplate.Range('F3').Value2=100
  $taskExcel.CalculateFullRebuild()
  Assert-Value $taskTemplate.Range('G3').Value2 '' 'no silent g ml conversion'
  $taskFoods.Range('G2').Value2='g';$taskExcel.CalculateFullRebuild()
  foreach($value in $taskTemplate.UsedRange.Value2){if($value -is [int] -and $value -ge -2146826300 -and $value -le -2146826240){throw 'native formula error'}}
  [IO.File]::WriteAllText((Join-Path $taskEvidence 'admin-stream-native-proof.json'),'{"checks":12,"rows":41457,"foods":3719,"columns":170,"nativeExcel":true,"passed":true}')
  Write-Output 'Admin streaming workbook: 12 native Excel checks passed.'
}finally{
  if($taskBook){$taskBook.Close($false)}
  if($taskExcel){$taskExcel.Quit();[Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskExcel)|Out-Null}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
