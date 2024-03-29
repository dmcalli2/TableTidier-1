library(plumber)
library(readr)
library(tidyxl)
library(unpivotr)
library(tidyverse)
library(XML)
library(xml2)
library(rjson)
library(future)



# Give the input file name to the function.
config <- fromJSON(file = "../config.json")

requestURL <- paste0(config$ui_host,":",config$api_port,config$api_base_url)

#* @apiTitle live results api

#' @filter cors
cors <- function(req, res) {

  res$setHeader("Access-Control-Allow-Origin", "*")

  if (req$REQUEST_METHOD == "OPTIONS") {
    res$setHeader("Access-Control-Allow-Methods","*")
    res$setHeader("Access-Control-Allow-Headers", req$HTTP_ACCESS_CONTROL_REQUEST_HEADERS)
    res$status <- 200
    return(list())
  } else {
    plumber::forward()
  }

}

baseFolder <- "~/ihw/tableAnnotator/Server/src/"
# setwd("~/ihw/tableAnnotator/Server/src")

# tablesDirectory <- "~/ihw/tableAnnotator/Server/HTML_TABLES_OVERRIDE/"
# new_obj <- readRDS(paste0(baseFolder,"Full_set_of_tables_Prepared.Rds"))

html_2_df <- function (pmid, page, collId){

  # print(requestURL)
  url <- paste0("http://",requestURL,"/getTable?docid=",pmid,"&page=",page,"&collId=",collId)
  
  print(url)
  
  JsonData <- fromJSON( file = url )

  # doc_string <- read_file(paste0("~/ihw/tableAnnotator/Server/HTML_TABLES_OVERRIDE/",pmid,"_",page,".html"))
  # print(JsonData)

  start <- (JsonData$tableBody %>% str_locate( "<html>"))[1]

  end_html_tag <- str_locate_all( JsonData$tableBody, "</html>")[[1]]
  end <- end_html_tag[end_html_tag %>% nrow(),][2]

  # end <- (JsonData$tableBody %>% str_locate( "</html>"))[2]

  tableBody <- substring(JsonData$tableBody,start,end)

  x <- read_xml(tableBody, as_html = TRUE)
  ps <- xml_find_all(x, ".//td/p")
  tds <- xml_find_all(x, ".//td")


  x_header <- read_xml(paste0("<html><body>",JsonData$tableTitle,"</body></html>"), as_html = TRUE) #read_xml(JsonData$tableTitle, as_html = FALSE)
  textHeader <- xml_text(xml_find_all(x_header, "//td"))


  df_tds <- data.frame("path"=xml_path(tds), "character"=xml_text(tds))

  df_ps <- data.frame("path" = xml_path(ps), "attr" = xml_attr(ps, "class") )
  df_ps <- df_ps %>% mutate("path" = gsub("/p", "", path) )


  strongs <- xml_text(xml_find_all(tds, ".//strong"))
  df_tds_strong <- df_tds %>% mutate (hasStrong = character %in% strongs )
  df_ps <- df_ps %>% inner_join(df_tds_strong) %>% mutate ( attr = paste0(attr," ",ifelse(hasStrong, "bold", "")) ) %>% select( path, attr)


  # debugger()
  possible_cols <- c(letters %>% str_to_upper(), c(outer(letters %>% str_to_upper() , letters %>% str_to_upper() , FUN=paste0)) )

  newdata <- suppressMessages(suppressWarnings( left_join(df_tds , df_ps) ))

  newdata <- newdata %>% mutate( character = ifelse(str_squish(character) == "", NA, as.character(character) ) )

  newdata <- newdata %>% mutate( pos = trimws(gsub("[^0-9]", " ", path), "both")) %>% separate(pos, c("row", "col"), "     ")

  newdata <- newdata %>% mutate( row = as.double(row), col = as.double(col))

  if(str_length(textHeader) > 0){
    newdata <- newdata %>% mutate( row = as.double(row)+1)
    header <- newdata %>% filter(NA)
    newdata <- newdata %>% mutate ( col = ifelse(is.na(col), 1, col))
    maxcol <- as.integer(newdata$col ) %>% max()
    header <- tibble(path=c("header"), character=c(NA), attr= c(NA), row=c(1), col=c(1:maxcol))
    header <- header %>% mutate(character=ifelse(col==1, textHeader, character))
    header <- header %>% rbind(tibble(path=c("header"), character=c(NA), attr= c(NA), row=c(2), col=c(1:maxcol)))

    newdata <- newdata %>% mutate( row = as.double(row)+2)

    newdata <- header %>% rbind(newdata)
  }



  newdata <- newdata %>% mutate( address = paste0(possible_cols[strtoi(col, base = 0L)],row))



  newdata <- newdata %>% mutate( is_empty = character %>% is.na())
  newdata <- newdata %>% mutate( is_blank = character %>% is.na())

  newdata <- newdata %>% group_by(row) %>% mutate(blank_row = all(is_empty) ) %>% ungroup()


  newdata <- newdata %>% mutate( bold = str_detect(attr,"bold"))
  newdata <- newdata %>% mutate( italic = str_detect(attr,"italic"))
  newdata <- newdata %>% mutate( first_col = str_detect(attr,"firstCol"))
  newdata <- newdata %>% mutate( first_last_col = str_detect(attr,"firstLastCol"))
  newdata <- newdata %>% mutate( indent = str_detect(attr,"indent"))
  newdata <- newdata %>% mutate( indent_lvl = trimws(gsub("[^0-9]", " ", attr), "both"))

  newdata[c("is_empty", "blank_row", "italic", "first_col", "first_last_col", "indent")][is.na(newdata[c("is_empty", "blank_row", "italic", "first_col", "first_last_col", "indent")])] <- FALSE
  newdata[c("attr")][is.na(newdata[c("attr")])] <- ""
  newdata[c("bold")][is.na(newdata[c("bold")])] <- FALSE

  newdata[c("indent_lvl")][is.na(newdata[c("indent_lvl")])] <- "0"
  newdata[c("indent_lvl")][!is.numeric(newdata[c("indent_lvl")])] <- "0"

  newdata <- newdata %>% mutate( search_round = "table_override")
  newdata <- newdata %>% mutate( sheet = "Sheet1")
  newdata <- newdata %>% mutate( pmid = pmid)
  newdata <- newdata %>% mutate( pmid_tbl = paste0(pmid,"_",page))
  newdata <- newdata %>% mutate( data_type = ifelse(is_empty, "blank", "character"))
  newdata <- newdata %>% mutate( has_no_num = str_length(trimws(gsub("[^0-9]", " ", character))) == 0 )
  newdata[c("has_no_num")][is.na(newdata[c("has_no_num")])] <- TRUE

  newdata <- newdata %>% mutate( tbl_n = page)
  newdata <- newdata %>% mutate( file_name = paste0(pmid,"_",page,".html"))
  newdata <- newdata %>% mutate( original_file_stored = NA)
  newdata <- newdata %>% mutate( ticker = 1)

  newdata <- newdata %>% select(c("search_round", "sheet", "address", "row", "col", "is_blank",
                                  "character", "bold", "italic", "indent", "data_type", "is_empty",
                                  "has_no_num", "tbl_n", "file_name", "blank_row", "first_col",
                                  "first_last_col", "original_file_stored", "pmid", "pmid_tbl",
                                  "ticker", "indent_lvl"))
  return(newdata)
}


runAll <- function(annotations, collId){

  # message("Joining by: ", capture.output(dput(by)))

  ## Function to allow matching of rows and column metadata
  NNW <- function(data_cells, header_cells) {
    if("character" %in% names(data_cells)) names(data_cells)[names(data_cells) == "character"] <- "value"

    d <- distinct(data_cells, col) %>%
      mutate(col_h = NA)

    h <- header_cells %>%
      rename(col_h = col) %>%
      select(col_h, character) %>%
      filter(!is.na(character))

    for(col_data in d$col){
      col_test <- col_data
      while(col_test > 0L){
        if(col_test %in% h$col_h) {
          d$col_h[d$col == col_data] <- col_test
          break()
        }
        col_test <- col_test -1

      }

    }

    suppressWarnings(suppressMessages(data_cells %>%
                                        inner_join(d) %>%
                                        inner_join(h) %>%
                                        select(-col_h)))
  }

  RemoveFalseQualifiers <- function(mydf, i_choose) {
    # We want to match the descriptions of the rows and columns based on formatting , asymmetrically
    # For example if "bold" is informative it should be included in the matching, but not otherwise
    # IF a characteristics is nto alisted among the qualifiers, then it is not informative

    mydf_i <- mydf %>%
      filter(i == i_choose)
    a <- (map_lgl(mydf_i, ~ !any(.x == FALSE)))

    for ( n in 1:length(a) ){

      if( is.na(a[n]) ){
        a[n] = FALSE
      } else {
        a[n] = a[n]
      }

    }

    return (  mydf_i[, a] )

  }


  ## Read trial annoated metadata ----
  ## Note 720 with metadata although 740 signed-off
  # suppressWarnings(suppressMessages(annotations <- read_csv("extracted_app.txt")))

  prepareAnnotations <- function( annotations ){

    metadata <- annotations
    metadata %>% distinct(docid, page)

    ## remove other tables and table text
    table(metadata$tableType)
    other <- metadata %>%
      filter(tableType == "other_table")

    # metadata <- metadata %>%
    #   filter(tableType != "other_table")

    ## Separate metadata to wide, only 6 possible values
    metadata <- metadata %>%
      mutate(number = as.integer(number)) %>%
      mutate(richness = str_count(qualifiers, ";") + 1L,
             richness = if_else(is.na(qualifiers), 0L, richness))

    metadata_qual <- metadata %>%
      filter(!is.na(qualifiers)) %>%
      separate(qualifiers, into = paste0("v", 1:6), sep = ";", fill = "left") %>%
      gather(key = "count_qual", value = "quals", v1:v6, na.rm= TRUE) %>%
      mutate(present = TRUE) %>%
      select(-count_qual) %>%
      spread(quals, present, fill = FALSE)

    metadata_noqual <- metadata %>%
      filter(is.na(qualifiers)) %>%
      select(-qualifiers)

    metadata_noqual[, c("bold","itallic", "plain",
                        "empty_row", "empty_row_with_p_value",
                        "indent")] <- FALSE

    metadata <- bind_rows(metadata_qual, metadata_noqual) %>%
      arrange(docid, page, location, number, desc(richness))

    metadata <- metadata %>% replace_na(list(empty_row = FALSE, bold = FALSE, itallic = FALSE, plain = FALSE, empty_row_with_p_value = FALSE, indent = FALSE))
    rm(metadata_noqual, metadata_qual)

    ## Rename metadata to match all_cells
    metadata <- metadata %>%
      rename(first_col = empty_row,
             first_last_col = empty_row_with_p_value,
             italic = itallic)

    metadata_all<- metadata %>%
      distinct(docid, page)

    ## Loop through all tables
    ## Select one table
    metadata <- metadata %>%
      mutate(docid_page = paste(docid, page, sep = "_"))

    return (metadata)
  }


  metadata <- prepareAnnotations( annotations )

  TidyTable <- function(docid_page_selected, collId ){

    meta <- metadata %>%
      filter(docid_page == docid_page_selected)

    ## WARNINGS
    # Return if tables lack row or column metadata
    if(! "Col" %in% meta$location) return("No column metadata")
    if(! "Row" %in% meta$location) return("No row metadata")
    # Return if formating does not distinguish differences within a row/column in which
    # a difference is asserted
    # eg if subgroup names nad subgroup labels have exactly the same fomratting
    meta_distinct <- meta %>%
      select(location, number, first_col, indent, bold,  italic, plain, first_last_col) %>%
      distinct()
    meta_d1 <- meta %>%
      group_by(location, number) %>%
      count()
    meta_d2 <- meta_distinct %>%
      group_by(location, number) %>%
      count() %>%
      rename(x = n)

    suppressWarnings(suppressMessages(meta_d3 <- meta_d1 %>%
                                        inner_join(meta_d2) %>%
                                        filter(n >x) %>%
                                        rename(`Number of identified groups` = n, `Number of distinct formatting` = x) ))

    if(nrow(meta_d3) >=1) return(list(warning = meta_d3))

    filename <- paste(meta$docid[1], meta$page[1], sep = "_")


    # if(file.exists(paste0(tablesDirectory, filename, ".html"))){
    all_cells <- html_2_df(meta$docid[1], meta$page[1], collId)



    # print(all_cells)
    # } else {
    # all_cells <- new_obj %>% filter( pmid_tbl == filename)
    # }

    ##  Simplify table by making all values character
    # If no numeric or no character columns, create
    if(!"numeric"   %in% names(all_cells)) all_cells <- all_cells %>% mutate(numeric = NA)
    if(!"character" %in% names(all_cells)) all_cells <- all_cells %>% mutate(chracter = NA)

    all_cells <- all_cells %>%
      mutate(data_type = if_else(is.na(character) & !is.na(numeric), "character", data_type),
             character = if_else(is.na(character), as.character(numeric), character))

    all_cells <- all_cells %>% mutate(local_format_id = seq_along(all_cells$row))

    all_cells_indnt <- all_cells %>%
      filter(indent) %>%
      distinct(row, col, indent_lvl)

    all_cells <- all_cells %>%
      select(-indent_lvl)

    ## Identify different types of empty row form completely empty of numbers
    # to ones where the first columns alone are not empty
    # to ones where the first and last columns are not empty

    ## First pad the dataframe by adding back in null cells, the package omits some empty cells
    ## ONly do so where the row or the column is already present
    all_cells_pad <- expand.grid(row = 1:max(all_cells$row), col = 1:max(all_cells$col))



    suppressWarnings(suppressMessages(all_cells_pad <- all_cells_pad %>%
                                        as_tibble() %>%
                                        semi_join(all_cells %>% distinct(row)) %>%
                                        semi_join(all_cells %>% distinct(col)) ))

    suppressWarnings(suppressMessages(all_cells_pad <- all_cells_pad %>%
                                        left_join(all_cells) %>%
                                        mutate(is_blank  = if_else(is.na(is_blank), TRUE, is_blank),
                                               data_type = if_else(is.na(data_type), "blank", data_type),
                                               sheet = sheet[1],
                                               address = paste0(LETTERS[row], col)) ))

    all_cells <- all_cells_pad
    rm(all_cells_pad)


    ## First check that all cells are either blank or character
    if(all(all_cells$data_type %in% c("character", "blank", "numeric"))) {
      all_cells <- all_cells %>%
        select(sheet, address, row, col, is_blank, character, bold, italic, indent, data_type) %>%
        mutate(is_empty   = is_blank | (!str_detect(character %>% str_to_lower(), "[:alnum:]")),
               has_no_num = is_blank | (!str_detect(character %>% str_to_lower(), "[0-9]")))

    } else return("Not all cells are character, numeric or blank, code will not work")
    # rectify(all_cells)

    BlankRow <- function (mydf) {
      empty_rows <- mydf %>%
        arrange(row, col) %>%
        group_by(row) %>%
        summarise(blank_row = all(is_empty)) %>%
        ungroup() %>%
        filter(blank_row) %>%
        distinct(row) %>%
        pull(row)
    }

    ## Identify split_header_row as the last empty row IN the first set of contiguos empty rows
    empty_rows <- BlankRow(all_cells)
    null_rows <- setdiff(1:max(all_cells$row), all_cells$row)
    empty_rows <- c(empty_rows, null_rows) %>%
      sort()
    empty_rows <- tibble(empty_rows = empty_rows, diff = lead(empty_rows, default = 1000L) - empty_rows)
    empty_rows <- empty_rows %>%
      filter(diff != 1)
    split_header <- empty_rows$empty_rows[1]

    # Next identify any rows which are completely blank
    blank_row <- all_cells %>%
      BlankRow()

    # Those which have no information after removing the first column, except a little text in some of the second columns
    first_col_1 <- all_cells %>%
      filter(!col %in% 1:2) %>%
      BlankRow()
    first_col_1_spill <- all_cells %>%
      filter(col == 2, has_no_num) %>%
      distinct(row) %>%
      pull(row)
    ## This allows for text only, but not numbers in the second column
    first_col <- intersect(first_col_1, first_col_1_spill)

    # Those which have no information after removing the first and last column
    first_last_col <- all_cells %>%
      group_by(row) %>%
      mutate(col_max = max(col)) %>%
      ungroup() %>%
      filter(!col %in% 1:2, col != col_max) %>%
      BlankRow()
    first_last_col  <- intersect(first_last_col,  first_col_1_spill)

    # Those which have only one cell containing information, after removing the first and last column,
    # and which are long rows (>= 4 blank cells)
    first_last_col_wide <- all_cells %>%
      group_by(row) %>%
      mutate(col_max = max(col)) %>%
      ungroup() %>%
      filter(!col %in% 1:2, col != col_max) %>%
      group_by(row) %>%
      summarise(few_p = sum(is_blank) >= 4) %>%
      filter(few_p) %>%
      pull(row)

    first_last_col_wide <- intersect(first_last_col_wide, first_col_1_spill)
    first_last_col <- union(first_last_col, first_last_col_wide)

    first_col <- setdiff(first_col, blank_row)
    first_last_col <- setdiff(first_last_col, c(first_col, blank_row))

    ## Add these onto all_cells
    all_cells <- all_cells %>%
      mutate(blank_row = row %in% blank_row,
             first_col = row %in% first_col,
             first_last_col = row %in% first_last_col)

    ## Take cells before first blank_row as table/figure name
    ## Take after this cut-point the table body
    ## reset the table body to reflect the new row 1 (same as in table annotator)

    if(length(split_header)==0) {
      return("Error no blank row of cells to separate data from figure name")} else{

        table_header_temp <- all_cells %>%
          filter(row < split_header) %>%
          pull(character)

        table_body_temp <- all_cells %>%
          filter(row > split_header) %>%
          mutate(row = row - split_header)

        if( table_body_temp %>% nrow() == 0 ){
          table_header <- all_cells %>% filter(FALSE)
          table_body <- all_cells
        } else {
          table_header <- table_header_temp
          table_body <- table_body_temp
        }
      }

    if ( is.na(split_header) ){
      table_body <- all_cells
      split_header <- 0
    }

    ## Also need to resent indent level
    all_cells_indnt <- all_cells_indnt %>%
      filter(row > split_header) %>%
      mutate(row = row - split_header)
    # table_header

    ########### Above this point common to all tables, provided extracted correctly
    ########### hereafter will depend upon metadata
    if(any(meta$location == "Col" & meta$number ==2)) print("Note two columns here, this is unusual")

    ## take table data component from within table body by excluding row-labels and columns-labels

    ## With a twist. P-interaction columns contain data, so should not be excluded. There may be other cases. so watch out. #####!!!!#####
    meta_for_tdata <- meta %>% filter( ! ( location == "Col" & content == 'p-interaction' & number > 1))

    table_body <- table_body %>% mutate( col = col - (min(table_body$col ) -1)) %>% mutate( row = row - (min(table_body$row ) -1)) ## Correction of tables making sure we start in col and row 1.

    table_data <- table_body %>%
      filter(! row %in% meta_for_tdata$number[meta_for_tdata$location == "Row"],
             ! col %in% meta_for_tdata$number[meta_for_tdata$location == "Col"])

    ## Arrange the metadata so that the most rich row and column qualifying descriptions precede the simplest
    ## tg from bold and itallics, take out itallics (for example) leaving only bold, then bold out leaving only plain, etc

    ## Merge column headers, first merge using qualifiers if there are any, if there are none, merge regardless
    col_lbls_meta <- meta %>%
      filter(location == "Col") %>%
      mutate(i = seq_along(location)) %>%
      rename(col = number)

    row_lbls_meta <- meta %>%
      filter(location == "Row") %>%
      mutate(i = seq_along(location)) %>%
      rename(row = number)


    col_lbls <- table_body %>%
      filter(col %in% col_lbls_meta$col,
             !row %in% row_lbls_meta$row)

    row_col_cross <- table_body %>%
      filter(col %in% col_lbls_meta$col,
             row %in% row_lbls_meta$row)

    ## If all of column labels are indented, attempt to resolve by comparing levels of indentation
    if(all(col_lbls$indent) & any(col_lbls_meta$indent)) {
      ## where there is no indent level, this must be right or centre aligned, give that the maximimal level
      suppressWarnings(suppressMessages(col_lbls <- col_lbls %>%
                                          left_join(all_cells_indnt) %>%
                                          mutate(indent_lvl = if_else(is.na(indent_lvl), max(indent_lvl), indent_lvl),
                                                 indent = if_else(indent_lvl == min(indent_lvl), FALSE, TRUE)) %>%
                                          select(-indent_lvl)))
    }

    data_cells <- table_data %>% select(row, col, character)

    for(i_choose in unique(col_lbls_meta$i)){
      ## Select each richest column description in turn, removing that from the dataset

      suppressWarnings(suppressMessages( h <- col_lbls %>%
                                           inner_join(RemoveFalseQualifiers(col_lbls_meta, i_choose)) %>%
                                           select(row, col, character) ))

      suppressWarnings(suppressMessages(col_lbls <- col_lbls %>%
                                          anti_join(h) ))
      ## remove cells without information to allow population across rows and columns, ignore, only use where
      ## the cell has actually been merged

      names(h)[3] <- col_lbls_meta$content[col_lbls_meta$i == i_choose] %>%  unique()

      if ( h %>% nrow > 0 ){
        data_cells <- data_cells %>%
          enhead(header_cells = h, direction = "WNW", drop = FALSE)
      }
    }

    ## Do the same now for rows, except dont worry about indentation
    row_lbls <- table_body %>%
      filter(row %in% row_lbls_meta$row,
             !col %in% col_lbls_meta$col)

    for(i_choose in unique(row_lbls_meta$i)){
      ## Select each richest column description in turn, removing that from the dataset

      suppressWarnings(suppressMessages(h <- row_lbls %>%
                                          inner_join(RemoveFalseQualifiers(row_lbls_meta, i_choose)) %>%
                                          select(row, col, character) ))

      suppressWarnings(suppressMessages( row_lbls <- row_lbls %>%
                                           anti_join(h) ))

      # h <- h %>% mutate (character = ifelse(is.na(character),"",character)) # Correction for NA's in character
      data_cells <- NNW(data_cells, h)
      new_name <- row_lbls_meta$content[row_lbls_meta$i == i_choose] %>%  unique()
      while(new_name %in% names(data_cells)) new_name <- paste0(new_name, "_")
      names(data_cells)[names(data_cells) == "character"] <- new_name
    }

    data_cells <- data_cells %>%
      filter(!is.na(value))

    return(data_cells)
  }

  # TidyTableSafe <- safely(TidyTable)
  TidyTableSafe <- safely(TidyTable)

  outputs <- map(metadata$docid_page %>% unique, ~ TidyTableSafe(.x, collId))

  # print(outputs)

  names(outputs) <- metadata$docid_page %>% unique()
  outputs <- transpose(outputs)


  result <- outputs$result
  result_success <- result[map_lgl(result, is_tibble)]
  result_success <- bind_rows(result_success, .id = "docid_page")

  return(result_success)
}

#* Echo provided text
#* @param text The text to be echoed in the response
#* @param number A number to be echoed in the response
#* @get /preview
#* @post /preview
function(req, anns = "" ) {
  # url <- paste0("http://localhost:6541/api/getTable?docid=11527638&page=1")
  # JsonData <- fromJSON(file= url )
  #
  # write_rds(anns, paste0(baseFolder,"last_out_other.rds"))
  #
  # anns <- read_rds(paste0(baseFolder,"last_out_other.rds"))

  annotations <- anns$annotation %>%
    as.data.frame() %>%
    mutate(docid = anns$docid,page = anns$page,user = anns$user,tableType = anns$tableType) %>%
    select(user,docid,page,tableType,location,number,content,qualifiers) %>%
    mutate(page = as.double(page)) %>%
    mutate(qualifiers = ifelse( qualifiers == "", NA, qualifiers)) %>%
    mutate(content = ifelse( content == "", NA, content)) %>%
    as_tibble()

  #    annotations <- anns$annotation %>%
  #      as.data.frame() %>%
  #      mutate(docid = anns$docid,page = anns$page,user = anns$user,corrupted = anns$corrupted,tableType = anns$tableType) %>%
  #      select(user,docid,page,corrupted,tableType,location,number,content,qualifiers) %>%
  #      mutate(page = as.double(page)) %>%
  #      mutate(corrupted = ifelse(corrupted == "false",FALSE,TRUE)) %>%
  #      mutate(qualifiers = ifelse( qualifiers == "",NA, qualifiers)) %>%
  #      mutate(content = ifelse( content == "",NA, content)) %>%
  #      as_tibble()

  # print(annotations)
  # annotations <- readRDS(paste0(baseFolder,"testing-annotations.rds"))


  collId <- anns$collection_id
  result <- value( future( runAll(annotations, collId) ) )

  # result %>%  View
  
  if ( result %>% nrow > 0){ # order by annotations order, if any results have been produced.
    result <- result %>% select(c("docid_page","row", "col", "value", anns$annotation$content))
  }

  list(
    tableResult = result,
    ann = anns
  )
}



#* Echo provided text
#* @get /test
#* @post /test
function(req, anns = "" ) {
  return("here we are")
}

# runAll(annotations, collId)

# plumb("~/ihw/tableAnnotator/Server/previewer/plumber.R")$run(port = 6666)
