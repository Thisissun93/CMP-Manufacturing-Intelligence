// CMP Manufacturing Intelligence v2 schema. Filename/order are intentionally irrelevant.
const S={
 Batch:[
  {name:'Batch_ID',type:'string'}, {name:'Product_ID',type:'string'}, {name:'Recipe_Rev',type:'string'},
  {name:'Site_ID',type:'string'}, {name:'Line_ID',type:'string'}, {name:'Equipment_ID',type:'string'},
  {name:'Start_TS',type:'timestamp'}, {name:'End_TS',type:'timestamp'}, {name:'Disposition',type:'string',enum:['RELEASED','HOLD','SCRAPPED']},
  {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ],
 Material:[
  {name:'Material_Record_ID',type:'string'}, {name:'Batch_ID',type:'string'}, {name:'Material_ID',type:'string'}, {name:'Lot_ID',type:'string'},
  {name:'Quantity',type:'number'}, {name:'Unit',type:'string'}, {name:'Charge_TS',type:'timestamp'}, {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ],
 Process:[
  {name:'Process_Record_ID',type:'string'}, {name:'Batch_ID',type:'string'}, {name:'Step_Run_ID',type:'string'}, {name:'Step_ID',type:'string'},
  {name:'Equipment_ID',type:'string'}, {name:'Parameter',type:'string'}, {name:'Value',type:'number'}, {name:'Unit',type:'string'},
  {name:'Event_TS',type:'timestamp'}, {name:'Step_Start_TS',type:'timestamp'}, {name:'Step_End_TS',type:'timestamp'},
  {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ],
 Equipment:[
  {name:'Equipment_Event_ID',type:'string'}, {name:'Equipment_ID',type:'string'}, {name:'Event_Type',type:'string',enum:['CLEANING','PM','CALIBRATION','FILTER_CHANGE','STATUS']},
  {name:'Valid_From_TS',type:'timestamp'}, {name:'Valid_To_TS',type:'timestamp'}, {name:'Result',type:'string',optional:true}, {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ],
 QC:[
  {name:'QC_Record_ID',type:'string'}, {name:'Batch_ID',type:'string'}, {name:'Sample_ID',type:'string'}, {name:'Analyte_ID',type:'string'},
  {name:'Value',type:'number',optional:true}, {name:'Unit',type:'string'}, {name:'Method_ID',type:'string'}, {name:'Spec_Rev',type:'string'},
  {name:'LSL',type:'number',optional:true}, {name:'USL',type:'number',optional:true}, {name:'Qualifier',type:'string',enum:['EQ','LT','GT','NOT_MEASURED']},
  {name:'Sample_TS',type:'timestamp'}, {name:'Result_TS',type:'timestamp'}, {name:'Is_Final',type:'boolean'}, {name:'Approval_Status',type:'string',enum:['APPROVED','PENDING','REJECTED']},
  {name:'Spec_Status',type:'string',enum:['DEMO','APPROVED','UNSPECIFIED']}, {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ],
 Checksheet:[
  {name:'Checksheet_Record_ID',type:'string'}, {name:'Scope_Type',type:'string',enum:['SITE','LINE','EQUIPMENT','BATCH']}, {name:'Scope_ID',type:'string'},
  {name:'Checklist_Type',type:'string',enum:['SHIFT_PRESTART','SHIFT_CLOSEOUT']}, {name:'Valid_From_TS',type:'timestamp'}, {name:'Valid_To_TS',type:'timestamp'},
  {name:'Completed_TS',type:'timestamp'}, {name:'Result',type:'string',enum:['PASS','FAIL','NA']}, {name:'Comment',type:'string',optional:true}, {name:'Data_Origin',type:'string',enum:['SYNTHETIC','ACTUAL']}
 ]
};
module.exports=S;
