// let finalQueries = [];
//                 const chunkedData = this.chunkArray(lookupData, 400);
//                 finalQueries = chunkedData.map(
//                   (chunk) => NrqlQuery.query({
//                     query:
//                     `${mainQuery}  WHERE ${lookupAttribute} IN (${chunk.join(
//                       ","
//                     )})`,
//                     accountId: parseInt(nrqlQueries[0].accountId),
//                     formatType: NrqlQuery.FORMAT_TYPE.RAW,
//                   })
                    
//                 );
//                 let finalData = {};
//                 // const lookupDataString = `${lookupData.join(",")}`;
//                 // const lookupDataWhere = `WHERE ${lookupAttribute} IN (${lookupDataString})`;
//                 // const finalQuery = `${mainQuery} ${lookupDataWhere}`;
//                 // console.log(data[0].data);
//                 console.log(finalQueries);
//                 Promise.all(finalQueries).then((res) => {
//                   console.log({res})
//                   finalData = res.shift().data;
//                   console.log({finalData})
//                   if (res.length > 0) {

//                     res.forEach(result => {
//                       console.log(finalData.facets)
//                       console.log(result.data.facets)
//                       result.data.facets.forEach(facet => {
//                         if (!JSON.stringify(finalData.facets).includes(facet.name)) {
//                           finalData.facets = [...finalData.facets, ...result.data.facets];
//                         }
//                       })
                      
//                     })
                    
//                   }
//                 });
//                 console.log({finalData})