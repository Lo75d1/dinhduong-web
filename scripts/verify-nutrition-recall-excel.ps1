param([string]$EvidenceDirectory = (Join-Path $PSScriptRoot '../evidence/nutrition-chat'))
$ErrorActionPreference='Stop';$taskExcel=$null;$taskBook=$null;$taskChecks=0
function Check-Near($actual,[double]$expected,$label){if($null -eq $actual -or $actual -is [string] -or [Math]::Abs([double]$actual-$expected)-gt 0.000001){throw "$label : $actual"};$script:taskChecks++}
function Check-Star($cell,[bool]$expected,$label){if(([string]$cell.Text).StartsWith('*') -ne $expected){throw "$label : $($cell.Text)"};$script:taskChecks++}
try {
 $taskEvidence=[IO.Path]::GetFullPath($EvidenceDirectory)
 $taskExcel=New-Object -ComObject Excel.Application;$taskExcel.Visible=$false;$taskExcel.DisplayAlerts=$false;$taskExcel.AutomationSecurity=3
 $taskBook=$taskExcel.Workbooks.Open((Join-Path $taskEvidence 'recall-2598-test.xlsx'),0,$false);$taskExcel.CalculateFullRebuild()
 $taskSurvey=$taskBook.Worksheets.Item('Phieu 24h');$taskEnergy=$taskBook.Worksheets.Item('Quy doi 24h');$taskInput=$taskBook.Worksheets.Item('Nhap khau phan');$taskReport=$taskBook.Worksheets.Item('Bao cao')
 $taskEnergyRow=0;for($i=7;$i -le $taskReport.UsedRange.Rows.Count;$i++){if($taskReport.Cells.Item($i,1).Value2 -eq 'Năng lượng'){$taskEnergyRow=$i}}
 Check-Near $taskReport.Cells.Item($taskEnergyRow,3).Value2 504 'same calculator baseline'
 Check-Near $taskSurvey.Range('F7').Value2 200 'cooked grams'
 Check-Near $taskSurvey.Range('G7').Value2 0.4 'conversion factor'
 Check-Near $taskSurvey.Range('H7').Value2 80 'raw clean grams'
 Check-Near $taskEnergy.Range('D7').Value2 104 'raw clean energy'
 Check-Star $taskInput.Range('G7') $true 'AI quantity prefix'
 Check-Star $taskInput.Range('G8') $false 'user quantity no prefix'
 Check-Star $taskSurvey.Range('F7') $true 'survey AI quantity prefix'
 Check-Star $taskSurvey.Range('G7') $true 'survey AI conversion prefix'
 Check-Star $taskBook.Worksheets.Item('Tu nhap').Range('L7') $true 'AI copied nutrient prefix'
 Check-Near $taskSurvey.Range('F7').Font.Size 15 'form 15pt'
 if($taskSurvey.Range('E7').Value2 -ne '*1 bát'){throw 'household AI prefix missing'};$taskChecks++
 if($taskSurvey.Range('H12').Value2 -ne '—'){throw 'whole VDD dish fabricated raw weight'};$taskChecks++
 $taskInput.Range('G7').Value2=300;$taskExcel.CalculateFullRebuild()
 Check-Near $taskSurvey.Range('F7').Value2 300 'cooked grams edited'
 Check-Near $taskSurvey.Range('H7').Value2 120 'raw clean grams edited'
 Check-Near $taskReport.Cells.Item($taskEnergyRow,3).Value2 556 'report follows edited amount'
 Check-Star $taskInput.Range('G7') $false 'edited user quantity prefix removed'
 Check-Star $taskSurvey.Range('F7') $false 'edited survey quantity prefix removed'
 Check-Star $taskSurvey.Range('H7') $true 'AI conversion still contributes to raw amount'
 if($taskSurvey.Range('E7').Value2 -ne '—'){throw 'old household measure retained after quantity edit'};$taskChecks++
 $taskInput.Range('K7').Value2=0.5;$taskExcel.CalculateFullRebuild()
 Check-Near $taskSurvey.Range('H7').Value2 150 'raw clean after conversion edit'
 Check-Star $taskSurvey.Range('G7') $false 'edited conversion prefix removed'
 Check-Star $taskSurvey.Range('H7') $false 'all contributing AI values edited'
 $taskInput.Range('K7').Value2=0.4
 $taskInput.Range('E7').Value2='test-rice-b';$taskExcel.CalculateFullRebuild()
 if($taskSurvey.Range('H7').Value2 -ne '—' -or $taskEnergy.Range('C7').Value2 -ne '—'){throw 'new Food ID silently treated as verified raw source'};$taskChecks++
 $taskInput.Range('E7').Value2='test-rice-a';$taskExcel.CalculateFullRebuild()
 Check-Near $taskReport.Cells.Item($taskEnergyRow,3).Value2 556 'restored source'
 foreach($sheet in $taskBook.Worksheets){foreach($value in $sheet.UsedRange.Value2){if($value -is [int] -and $value -ge -2146826300 -and $value -le -2146826240){throw "formula error in $($sheet.Name)"}}};$taskChecks++
 foreach($name in @('Phieu 24h','Quy doi 24h')){$sheet=$taskBook.Worksheets.Item($name);$sheet.ExportAsFixedFormat(0,(Join-Path $taskEvidence ($name.Replace(' ','-')+'-verified.pdf')));$taskChecks++}
 $taskSurvey.Activate();$taskBook.SaveAs((Join-Path $taskEvidence 'recall-2598-native-saved.xlsx'),51)
 [IO.File]::WriteAllText((Join-Path $taskEvidence 'recall-native-proof.json'),('{"checks":'+$taskChecks+',"nativeExcel":true}'))
 Write-Output "Recall native Excel: $taskChecks checks passed."
}finally{if($taskBook){$taskBook.Close($false)};if($taskExcel){$taskExcel.Quit();[Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskExcel)|Out-Null};[GC]::Collect();[GC]::WaitForPendingFinalizers()}
