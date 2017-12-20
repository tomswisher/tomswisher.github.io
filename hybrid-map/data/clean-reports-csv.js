'use strict'; /* globals d3, console, nodes, count */ /* jshint -W069, unused:false */

var csvString = 'data:text/csv;charset=utf-8,';
var cleanData = [];
var columnHashes = [
  {type:'number', canon:'report',       list:['Report']},
  {type:'number', canon:'dollars',      list:['dollars']},
  {type:'string', canon:'month',        list:['month']},
  {type:'number', canon:'year',         list:['year']},
  {type:'string', canon:'source-state', list:['source_state']},
  {type:'string', canon:'source-id',    list:['source_name                           ']},
  {type:'string', canon:'target-state', list:['target_state']},
  {type:'string', canon:'target-id',    list:['target_name                           ']},
];
var idHashes = [
    {canon:'Action Now Initiative'                                , list:['Action Now Initiative']},
    {canon:'Alice Walton'                                         , list:['Alice Walton']},
    {canon:'Alliance for Better Classrooms, ABC Inc'              , list:['Alliance for Better Classrooms, ABC Inc.']},
    {canon:'American LeadHERship PAC'                             , list:['American LeadHERship PAC']},
    {canon:'Andrew Cuomo 2018, Inc'                               , list:['Andrew Cuomo 2018, Inc.']},
    {canon:'Ann Dinning'                                          , list:['Ann Dinning']},
    {canon:'Ann Rowe'                                             , list:['Ann Rowe']},
    {canon:'Arthur Samberg'                                       , list:['Arthur Samberg']},
    {canon:'Barbara Grigsby'                                      , list:['Barbara Grigsby']},
    {canon:'Betsy DeVos'                                          , list:['Betsy DeVos']},
    {canon:'Better Schools Now!'                                  , list:['Ortiz, Ortega, Iglesia &amp; [Damaris] Gonzalez Better Schools Now for Perth Amboy']},
    {canon:'Better Schools, Better Futures'                       , list:['Better Schools, Better Futures']},
    {canon:'Bill Gates'                                           , list:['Bill Gates']},
    {canon:'Bobbie Jindal Campaign Committee'                     , list:['Bobbie Jindal Campaign Committee']},
    {canon:'Brian Olson'                                          , list:['Brian Olson']},
    {canon:'Bruce Kovner'                                         , list:['Bruce Kovner']},
    {canon:'Cajun Industries'                                     , list:['Cajun Industries']},
    {canon:'California Charter Schools Association IEC'           , list:['California Charter Schools Association IEC']},
    {canon:'Carolyn Hill'                                         , list:['Carolyn Hill']},
    {canon:'Carrie Walton Penner'                                 , list:['Carrie Walton Penner']},
    {canon:'Catherine Goodwin Rocco'                              , list:['Catherine Goodwin Rocco']},
    {canon:'Chas Roemer'                                          , list:['Chas Roemer']},
    {canon:'Christine Chambers'                                   , list:['Christine Chambers Gil llan']},
    {canon:'Christy Mack'                                         , list:['Christy Mack']},
    {canon:'Coalition for Public Charter Schools PAC'             , list:['Coalition for Public Charter Schools PAC']},
    {canon:'Daniel Loeb'                                          , list:['Daniel Loeb']},
    {canon:'Daniel Ritchie'                                       , list:['Daniel Ritchie']},
    {canon:'David Scanavina'                                      , list:['David Scanavina']},
    {canon:'DFER LA'                                              , list:['DFER-LA']},
    {canon:'DFER NY'                                              , list:['DFER New York State', 'DFER']},
    {canon:'Doris Fisher'                                         , list:['Doris Fisher']},
    {canon:'Ed Reform Now Advocacy'                               , list:['Ed Reform Now Advocacy']},
    {canon:'Eddie Rispone'                                        , list:['Eddie Rispone']},
    {canon:'Education Reform Now'                                 , list:['Education Reform Now']},
    {canon:'Eli Broad'                                            , list:['Eli Broad']},
    {canon:'Elizabeth Ainslee'                                    , list:['Elizabeth Ainslee']},
    {canon:'Elizabeth Curry'                                      , list:['Elizabeth Curry']},
    {canon:'Emma Bloomberg'                                       , list:['Emma Bloomberg']},
    {canon:'Empower Louisiana PAC'                                , list:['Empower Louisiana PAC', 'Empower Louisiana']},
    {canon:'Future PAC'                                           , list:['Future PAC']},
    {canon:'Gary Jones'                                           , list:['Gary Jones']},
    {canon:'Gina Raimondo'                                        , list:['Gina Raimondo']},
    {canon:'Glenny Lee Buquet'                                    , list:['Glenny Lee Buquet']},
    {canon:'Gray Parker'                                          , list:['Gray Parker']},
    {canon:'Great Public Schools PAC'                             , list:['Great Public Schools PAC']},
    {canon:'Greg Penner'                                          , list:['Greg Penner']},
    {canon:'Happy Haynes'                                         , list:['Happy Haynes', 'Happy Hanes']},
    {canon:'Holly Boffy'                                          , list:['Holly Boffy']},
    {canon:'Improve Our Schools'                                  , list:['Improve Our Schools']},
    {canon:'ISC Constructors, LLC'                                , list:['ISC Constructors, LLC']},
    {canon:'Jackie Bezos'                                         , list:['Jackie Bezos']},
    {canon:'Jada Lewis'                                           , list:['Jada Lewis']},
    {canon:'James Garvey'                                         , list:['James Garvey']},
    {canon:'Jason Engen'                                          , list:['Jason Engen']},
    {canon:'Jeffries Team for Newark'                             , list:['Jeffries Team for Newark']},
    {canon:'Jenna Mack'                                           , list:['Jenna Mack']},
    {canon:'Jennifer Chambers-Myers'                              , list:['Jennifer Chambers-Myers']},
    {canon:'Jessica Fisher'                                       , list:['Jessica Fisher']},
    {canon:'Jim Walton'                                           , list:['Jim Walton']},
    {canon:'Joel Greenblatt'                                      , list:['Joel Greenblatt']},
    {canon:'John Allen (Jay) Guillot'                             , list:['John Allen (Jay) Guillot']},
    {canon:'John and Laura Arnold Foundation'                     , list:['John and Laura Arnold Foundation']},
    {canon:'John Arnold'                                          , list:['John Arnold']},
    {canon:'John Fisher'                                          , list:['John Fisher']},
    {canon:'John Mack'                                            , list:['John Mack']},
    {canon:'John Scully'                                          , list:['John Scully']},
    {canon:'Jonathan Sackler'                                     , list:['Jonathan Sackler']},
    {canon:'Julia Greenblatt'                                     , list:['Julia Greenblatt']},
    {canon:'Karen Ackman'                                         , list:['Karen Ackman']},
    {canon:'Kenneth Fisher'                                       , list:['Kenneth Fisher']},
    {canon:'Kent Thiry'                                           , list:['Kent Thiry']},
    {canon:'Kiernan Goodwin'                                      , list:['Kiernan Goodwin']},
    {canon:'Kira Orange-Jones'                                    , list:['Kira Orange-Jones']},
    {canon:'Kojaian Management'                                   , list:['Kojaian Management']},
    {canon:'Lane Grigsby'                                         , list:['Lane Grigsby']},
    {canon:'Laura Arnold'                                         , list:['Laura Arnold']},
    {canon:'Laurene Powell Jobs'                                  , list:['Laurene Powell Jobs']},
    {canon:'Lee Ainslee'                                          , list:['Lee Ainslee']},
    {canon:'Leree Taylor'                                         , list:['Leree Taylor']},
    {canon:'Leslie Jacobs'                                        , list:['Leslie Jacobs']},
    {canon:'Lewis Katz'                                           , list:['Lewis Katz']},
    {canon:'Linda Rispone'                                        , list:['Linda Rispone']},
    {canon:'Lisa Flores'                                          , list:['Lisa Flores']},
    {canon:'Louis Gagnon'                                         , list:['Louis Gagnon']},
    {canon:'Louisiana Federation for Children PAC'                , list:['Louisiana Federation for Children PAC']},
    {canon:'Margaret Loeb'                                        , list:['Margaret Loeb']},
    {canon:'McKinley Associates'                                  , list:['McKinley Associates']},
    {canon:'Melinda Gates'                                        , list:['Melinda Gates']},
    {canon:'Michael Bloomberg'                                    , list:['Michael Bloomberg']},
    {canon:'Michael Wolf'                                         , list:['Michael Wolf']},
    {canon:'Michelle Yee'                                         , list:['Michelle Yee']},
    {canon:'Mike Bezos'                                           , list:['Mike Bezos']},
    {canon:'Minnesota Progressive Education Fund'                 , list:['Minnesota Progressive Education Fund']},
    {canon:'Neil Gagnon'                                          , list:['Neil Gagnon']},
    {canon:'New Yorkers for Putting Students First'               , list:['New Yorkers for Putting Students First']},
    {canon:'Newark First'                                         , list:['Newark First']},
    {canon:'Nicolas Hanauer'                                      , list:['Nicolas Hanauer']},
    {canon:'Pat Stryker'                                          , list:['Pat Stryker']},
    {canon:'Patricia Chambers'                                    , list:['Patricia Chambers']},
    {canon:'Paul Allen'                                           , list:['Paul Allen']},
    {canon:'Paul Jones II'                                        , list:['Paul Jones II']},
    {canon:'Paul Tudor Jones'                                     , list:['Paul Tudor Jones']},
    {canon:'Philip Reyes'                                         , list:['Philip Reyes']},
    {canon:'Public Charter School PAC'                            , list:['Public Charter School PAC']},
    {canon:'Raising Colorado'                                     , list:['Raising Colorado']},
    {canon:'Ravenel Curry'                                        , list:['Ravenel Curry']},
    {canon:'Raymond Chambers'                                     , list:['Raymond Chambers']},
    {canon:'Reed Hastings'                                        , list:['Reed Hastings']},
    {canon:'Reid Hoffman'                                         , list:['Reid Hoffman']},
    {canon:'Rhode Island Democratic State Committee Contributions', list:['Rhode Island Democratic State Committee Contributions']},
    {canon:'Richard DeVos'                                        , list:['Richard DeVos']},
    {canon:'Samuel Cole'                                          , list:['Samuel Cole']},
    {canon:'Samuel Gary'                                          , list:['Samuel Gary']},
    {canon:'Sandra LeBlanc Holloway'                              , list:['Sandra LeBlanc Holloway']},
    {canon:'Sandra Rosenthal'                                     , list:['Sandra Rosenthal']},
    {canon:'Scott Jacobs'                                         , list:['Scott Jacobs']},
    {canon:'Sonia Jones'                                          , list:['Sonia Jones']},
    {canon:'Stacey Schusterman'                                   , list:['Stacey Schusterman']},
    {canon:'Stand for Children'                                   , list:['Stand for Children', 'Stand for Children Louisiana PAC']},
    {canon:'Stephen Mack'                                         , list:['Stephen Mack']},
    {canon:'Stephen Rosenthal'                                    , list:['Stephen Rosenthal']},
    {canon:'Steve Fisher'                                         , list:['Steve Fisher']},
    {canon:'Steven Galbraith'                                     , list:['Steven Galbraith']},
    {canon:'Students First'                                       , list:['Students First']},
    {canon:'Thomas and Susan Dunn'                                , list:['Thomas and Susan Dunn']},
    {canon:'Todd Grigsby'                                         , list:['Todd Grigsby']},
    {canon:'Tony Davis'                                           , list:['Tony Davis']},
    {canon:'Vulcan'                                               , list:['Vulcan']},
    {canon:'William Ackman'                                       , list:['William Ackman']},
    {canon:'William Bloomfield'                                   , list:['William Bloomfield']},
    {canon:'Winston Fisher'                                       , list:['Winston Fisher']},
    {canon:'Yes on 1240'                                          , list:['Yes on 1240: Washington Coalition for Public Charter Schools' ]}
];

d3.csv('raw-07-31-2017.csv', data => {
  cleanData = data.map(function(d) {
    var dClean = {};
    Object.keys(d).forEach(function(key) {
      columnHashes.some(function(columnHash) {
        if (columnHash.list.includes(key)) {
          switch (columnHash.type) {
            case 'number':
              dClean[columnHash.canon] = parseInt(d[key].trim().replace(/[\$,\,]/g, ''));
              break;
            case 'string':
              dClean[columnHash.canon] = d[key].trim();
              if (columnHash.canon.substr(6) === '-id') {
                idHashes.some(function(idHash) {
                  if (idHash.list.includes(dClean[columnHash.canon])) {
                    dClean[columnHash.canon] = idHash.canon;
                    return true;
                  }
                });
              }
              break;
          }
          return true;
        }
      });
    });
    return dClean;
  });
  console.log(cleanData[0], cleanData[1]);
  columnHashes.forEach((d, i) => {
    csvString = csvString + String(d.canon) + (i !== columnHashes.length-1 ? ', ' : '');
  });
  csvString = csvString + '\r\n';
  cleanData.forEach(row => {
    var rowString = '';
    Object.keys(row).forEach((key, i) => {
      let value = (key.substring(6) === '-id') ? '"'+String(row[key])+'"' : String(row[key]);
      rowString = rowString + value + (i !== columnHashes.length-1 ? ', ' : '');
    });
    csvString = csvString + rowString + '\r\n';
  });
  // console.log(csvString);
  window.open(encodeURI(csvString));
});