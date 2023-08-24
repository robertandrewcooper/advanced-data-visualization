## Advanced Data Visualization (QSS 19) Spring 2023
## Project 3: The Fanciest Data Visualization
##
## Name: Olivia Giandrea
## Date: June 7th, 2023

library(tidyverse)
library(ggplot2)
library(plotly)
library(dplyr)
library(stringr)
library(shiny)
library(colorBlindness)


###############################################################################
##
## Data Cleaning
##
###############################################################################

# first, read in all the data I found at https://www.bls.gov/tus/data/datafiles-2021.htm
actData <- read.table("C:/Users/olivi/Desktop/qss19/projects/proj3/atusact_2021.dat", header=TRUE, sep=",")
glimpse(actData)

# clean data
actData <- actData %>%
  # rename some columns to make cleaning easier
  rename(id = TUCASEID, duration = TUACTDUR24, cum_dur = TUCUMDUR24, 
         start = TUSTARTTIM, stop = TUSTOPTIME, tier1 = TUTIER1CODE, 
         tier2 = TUTIER2CODE, tier3 = TUTIER3CODE) %>%
  # relate activity tier codes to activity names 
  # according to this lexicon: https://www.bls.gov/tus/lexicons/lexiconnoex2021.pdf
  mutate(act_id = case_when(
    tier1 == 1 & tier2 == 1 ~ 0,
    tier1 == 1 & tier2 != 1 ~ 1,
    tier1 == 11 ~ 2,
    tier1 == 6 ~ 3,
    tier1 == 5 ~ 4,
    tier1 == 2 ~ 5,
    tier1 == 15 | tier1 == 3 | tier1 == 4 ~ 6,
    tier1 == 12 ~ 7,
    tier1 == 13 ~ 8,
    tier1 == 14 ~ 9,
    tier1 == 18 ~ 11,
    TRUE ~ 10
  )) %>%
  mutate(act_name = case_when(
    act_id == 0 ~ "Sleeping",
    act_id == 1 ~ "Personal Care",
    act_id == 2 ~ "Eating / Drinking",
    act_id == 3 ~ "Education",
    act_id == 4 ~ "Work",
    act_id == 5 ~ "Housework",
    act_id == 6 ~ "Volunteer / Care for Others",
    act_id == 7 ~ "Leisure",
    act_id == 8 ~ "Sports",
    act_id == 9 ~ "Religion",
    act_id == 10 ~ "Other",
    TRUE ~ "Traveling"
  )) %>%
  # select only the columns we care about
  select(id, act_id, act_name, duration, cum_dur, start, stop)
glimpse(actData)

# check how many unique respondents we're currently working with
print(distinct_ids <- actData %>%
        select(id) %>%
        distinct() %>%
        n_distinct())

# since we're currently working with >9000 distinct ids, let's cut down to 1000
# find the first 1000 unique ids
first_1000 <- actData %>% distinct(id) %>% head(1000) %>% pull() 
# filter to only results from those respondents
actData <- actData %>% filter(id %in% first_1000)

# we have >17000 rows, but only 1000 unique respondents. perfect!
print(distinct_ids <- actData %>%
        select(id) %>%
        distinct() %>%
        n_distinct())
glimpse(actData)


###############################################################################
##
## Formatting Data for JS (TSV File)
##
###############################################################################

create_alternating_string <- function(df, id_column, act_id_column, duration_column) {
  # Create an empty dataframe to store the result
  result_df <- data.frame(id = character(), alternating_string = character(), stringsAsFactors = FALSE)
  
  # Get unique IDs
  unique_ids <- unique(df[[id_column]])
  
  # Iterate over unique IDs
  for (id in unique_ids) {
    # Subset the dataframe for the current ID
    subset_df <- df[df[[id_column]] == id, ]
    
    # Create an empty string
    alternating_str <- ""
    
    # Iterate over rows with the current ID
    for (i in 1:nrow(subset_df)) {
      # Get the 'act_id' and 'duration' values
      act_id <- subset_df[[act_id_column]][i]
      duration <- subset_df[[duration_column]][i]
      
      # Append the alternating string
      alternating_str <- paste0(alternating_str, act_id, ",", duration, ",")
    }
    
    # Remove the trailing comma
    alternating_str <- substr(alternating_str, 1, nchar(alternating_str) - 1)
    
    # Add the row to the result dataframe
    result_df <- rbind(result_df, data.frame(id = id, alternating_string = alternating_str, stringsAsFactors = FALSE))
  }
  
  # Return the result dataframe
  return(result_df)
}

result_df <- create_alternating_string(actData, "id", "act_id", "duration")
head(result_df$alternating_string)

# write data to TSV file
write.table(result_df$alternating_string, 
            file = "C:/Users/olivi/Desktop/qss19/projects/proj3/d3_data.tsv", 
            sep = "\t", 
            row.names = FALSE)








