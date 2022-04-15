import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardBody,
  HeadingText,
  NrqlQuery,
  Spinner,
  AutoSizer,
  BarChart,
  LineChart,
  AreaChart,
  BillboardChart,
  TableChart,
  NerdletStateContext,
  nerdlet,
  PieChart,
  navigation,
  Tooltip,
} from "nr1";
const optionalClauses = [
  "AS",
  "COMPARE",
  "EXTRAPOLATE",
  "FACET",
  "LIMIT",
  "OFFSET",
  "ORDER",
  "SHOW",
  "SINCE",
  "SLIDE",
  "TIMESERIES",
  "UNTIL",
  "WHERE",
  "WITH",
];
export default class LookupTableVizVisualization extends React.Component {
  // Custom props you wish to be configurable in the UI must also be defined in
  // the nr1.json file for the visualization. See docs for more details.
  static propTypes = {
    chartType: PropTypes.string,
    /**
     * An array of objects consisting of a nrql `query` and `accountId`.
     * This should be a standard prop for any NRQL based visualizations.
     */
    nrqlQueries: PropTypes.arrayOf(
      PropTypes.shape({
        accountId: PropTypes.number,
        query: PropTypes.string,
      })
    ),
  };
  constructor(props) {
    super(props);
    this.state = {
      filters: "",
      dashboardUrl: null,
    };
  }

  /**
   * Restructure the data for a non-time-series, facet-based NRQL query into a
   * form accepted by the Recharts library's RadarChart.
   * (https://recharts.org/api/RadarChart).
   */
  transformData = (rawData) => {
    return rawData.map((entry) => ({
      name: entry.metadata.name,
      // Only grabbing the first data value because this is not time-series data.
      value: entry.data[0].y,
    }));
  };

  /**
   * Format the given axis tick's numeric value into a string for display.
   */
  formatTick = (value) => {
    return value.toLocaleString();
  };
  transformNrql = (query) => {
    const queries = query.split("LOOKUP");
    return { mainQuery: queries[0], lookupQuery: `FROM ${queries[1]}` };
  };

  parseQuery = (query) => {
    const calculateSince = (string) => {
      const upto = optionalClauses.join("|");
      const regexSince = new RegExp(`since(.*?)(?=${upto}|$)`, "i");
      return string.match(regexSince)[0];
    };

    const from = query.match(/(?<=from\s*)(.*?)(?=$|\s)/gi).find((e) => e);
    console.log({ from, query: query
      .match(/(?<=select\s*)(.*?)(?=$|\s)/gi)
      .find((e) => e) });
    let selectAttribute = query
      .match(/(?<=select\s*)(.*?)(?=$|\s)/gi)
      .find((e) => e)
    if (selectAttribute.includes("(")) {
      selectAttribute = selectAttribute.match(/(?<=\()(.*?)(?=\)|\,)/gi).find((e) => e);
    }
    console.log({ selectAttribute });

    // const since = calculateSince(query.match(/since.*/i)[0]);

    return selectAttribute;
  };

  facetFilterTableClick = (col, row, filters, nerdletState) => {
    const { dashboardUrl } = this.props;
    // console.log({ row, col });

    // console.log({ dashboardUrl, nerdletState, filters });
    if (dashboardUrl) {
      nerdletState.selectedPage = dashboardUrl;
      nerdletState.filters = `${col} = \`${row[col]}\``;
    } else {
      // console.log(`${filters} AND ${col} = \`${row[col]}\``);
      nerdletState.filters = filters ? `${filters} AND ${col} = \`${row[col]}\`` : `${col} = \`${row[col]}\``;
    }
    return nerdlet.setUrlState(nerdletState);
  };
  facetFilterBarClick = (col, lookupAttribute, filters, nerdletState) => {
    const { dashboardUrl } = this.props;
    // console.log({ col });

    const filterValue = col.metadata.name;
    // console.log({ filterValue, lookupAttribute });
    nerdletState.filters = filters
      ? `${filters} AND ${lookupAttribute} = '${filterValue}'`
      : `${lookupAttribute} = '${filterValue}'`;
    // console.log({ dashboardUrl, nerdletState });
    if (dashboardUrl) {
      nerdletState.selectedPage = dashboardUrl;
    }
    return nerdlet.setUrlState(nerdletState);
  };
  chunkArray = (arr, chunkSize) => {
    let i,
      j,
      temp = [];
    for (i = 0, j = arr.length; i < j; i += chunkSize) {
      temp.push(arr.slice(i, i + chunkSize));
    }
    return temp;
  };
  render() {
    const { nrqlQueries, chartType } = this.props;
    const nrqlQueryPropsAvailable =
      nrqlQueries &&
      nrqlQueries[0] &&
      nrqlQueries[0].accountId &&
      nrqlQueries[0].query;

    if (!nrqlQueryPropsAvailable) {
      return <EmptyState />;
    }
    const { mainQuery, lookupQuery } = this.transformNrql(nrqlQueries[0].query);
    console.log({ mainQuery, lookupQuery });
    const lookupAttribute = this.parseQuery(lookupQuery);
    console.log({ lookupAttribute });
    return (
      <NerdletStateContext.Consumer>
        {(nerdletState) => {
          const { filters } = nerdletState;
          // console.log({ nerdletState });
          const lookupQueryWithFilters = `${lookupQuery}${
            filters ? ` WHERE ${filters}` : ""
          }`;

          return (
            <NrqlQuery
              query={lookupQueryWithFilters}
              accountId={parseInt(nrqlQueries[0].accountId)}
              pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
            >
              {({ data, loading, error }) => {
                if (loading) {
                  return <Spinner />;
                }

                if (error) {
                  if (error.message.includes('No events found')) {
                    return <LookupNoData />;
                  }
                  return <ErrorState />
                }
                console.log({ data });
                const lookupData = data[0].data.map(
                  (entry) => `'${entry[lookupAttribute].replace(/'/g, "\\'")}'`
                );
                const lookupDataString = `${lookupData.join(",")}`;
                const lookupDataWhere = `WHERE ${lookupAttribute} IN (${lookupDataString})`;
                const joinedQuery = `${mainQuery} ${lookupDataWhere}`;
                let finalQuery, warning;
                if (
                  lookupQueryWithFilters.includes("WHERE") ||
                  !joinedQuery.length >= 20000
                ) {
                  finalQuery = `${mainQuery} ${lookupDataWhere}`;
                } else {
                  finalQuery = mainQuery;
                  warning =
                    "The query is too long to be run on the server. Please apply filters to narrow your results.";
                }
                // console.log(data[0].data);
                return (
                  <AutoSizer>
                    {({ width, height }) => (
                      <NrqlQuery
                        query={finalQuery}
                        accountId={parseInt(nrqlQueries[0].accountId)}
                        pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
                      >
                        {({ data, loading, error }) => {
                          if (loading) {
                            return <Spinner />;
                          }

                          if (error) {
                            console.log({ error });
                            if (error.message.includes('No events found')) {
                              return <NoData />;
                            }
                            return <ErrorState />
                          }
                          const { dashboardUrl } = this.props;

                          if (data) {
                            // const formattedData = this.formatTimeseries(data, filters);
                            if (chartType === "table" || !chartType) {
                              return (
                                <Tooltip text={dashboardUrl ? 'Filter another dashboard' : 'Filter this dashboard'}>
                                  <TableChart
                                    data={data}
                                    onClickTable={(col, row) =>
                                      this.facetFilterTableClick(
                                        col,
                                        row,
                                        filters,
                                        nerdletState
                                      )
                                    }
                                    fullHeight
                                    fullWidth
                                  />
                                </Tooltip>
                              );
                            }
                            if (chartType === "bullet") {
                              return (
                                <Tooltip text={dashboardUrl ? 'Filter another dashboard' : 'Filter this dashboard'}>
                                  <BarChart
                                    data={data}
                                    onClickBar={(col) =>
                                      this.facetFilterBarClick(
                                        col,
                                        lookupAttribute,
                                        filters,
                                        nerdletState
                                      )
                                    }
                                    fullHeight
                                    fullWidth
                                  />
                                </Tooltip>
                              );
                            }
                            if (chartType === "billboard") {
                              return (
                                <BillboardChart
                                  data={data}
                                  fullHeight
                                  fullWidth
                                />
                              );
                            }
                            if (chartType === "line") {
                              return (
                                <LineChart data={data} fullHeight fullWidth />
                              );
                            }
                            if (chartType === "area") {
                              return (
                                <AreaChart data={data} fullHeight fullWidth />
                              );
                            }
                            if (chartType === "pie") {
                              return (
                                <PieChart data={data} fullHeight fullWidth />
                              );
                            }
                          }
                        }}
                      </NrqlQuery>
                    )}
                  </AutoSizer>
                );
              }}
            </NrqlQuery>
          );
        }}
      </NerdletStateContext.Consumer>
    );
  }
}

const EmptyState = () => (
  <Card className="EmptyState">
    <CardBody className="EmptyState-cardBody">
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Please provide at least one NRQL query & account ID pair
      </HeadingText>
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
        type={HeadingText.TYPE.HEADING_4}
      >
        An example NRQL query you can try is:
      </HeadingText>
      <code>
        SELECT latest(Billable_GB_Ingested) FROM RunRateConsumptionWW_V1 facet
        Account_Name since 1 month ago limit max LOOKUP TechTeamLookupV1 SELECT
        Account_Name
      </code>
    </CardBody>
  </Card>
);

const ErrorState = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Oops! Something went wrong.
      </HeadingText>
    </CardBody>
  </Card>
);

const LookupNoData = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        The lookup query returned no data
      </HeadingText>
    </CardBody>
  </Card>
);

const NoData = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        The query returned no data
      </HeadingText>
    </CardBody>
  </Card>
);