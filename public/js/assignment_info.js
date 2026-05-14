    async function showAssignmentInfo(classIndex, assignmentIndex) {
        let assignmentDate = parsedData[classIndex].assignmentDates[assignmentIndex];
        let assignmentName = parsedData[classIndex].assignmentNames[assignmentIndex];
        let assignmentCategory = parsedData[classIndex].assignmentCategories[assignmentIndex];
        let assignmentScore = parsedData[classIndex].assignmentScoresParsed[assignmentIndex];
        let assignmentDescription = parsedData[classIndex].assignmentDescriptions[assignmentIndex];
        let assignmentComments = parsedData[classIndex].assignmentComments[assignmentIndex];
        let assignmentPSAID = parsedData[classIndex].assignmentPSAIDs[assignmentIndex];
        let isExtraCredit = assignmentScore.endsWith("/0");

        let infoAverage = $("#infoAverage");
        let assignmentInfoDate = $("#assignmentInfoDate");
        let assignmentInfoDateEditable = $("#assignmentInfoDateEditable");
        let assignmentInfoName = $("#assignmentInfoName");
        let assignmentInfoCategory = $("#assignmentInfoCategory");
        let assignmentInfoScore = $("#assignmentInfoScore");
        let assignmentInfoDescription = $("#assignmentInfoDescription");
        let assignmentInfoComments = $("#assignmentInfoComments");

        let assignmentInfoLoading = $("#assignmentInfoLoading")

        $("#assignmentInfoBody div:not(#infoAverage)").css("background-color", withAlpha(colors[classIndex], 10));
        $("#infoAverage .unlock-with").hide();
        $("#assignmentInfoGraderoomUsers").text("--");
        $("#assignmentInfoGraderoomUsers ~ span > span:first-child").text("Graderoom Users this semester");
        $("#assignmentInfoAverage").removeClass("locked").text("--");

        infoAverage.show();
        assignmentInfoDate.text(assignmentDate).parent("span").show();
        assignmentInfoDateEditable.parent("span").hide();
        assignmentInfoName.text(assignmentName);
        assignmentInfoCategory.text(assignmentCategory);
        assignmentInfoScore.text(assignmentScore);
        if (assignmentDescription) {
            assignmentInfoDescription.html(assignmentDescription).parent("div").show();
        } else {
            assignmentInfoDescription.parent("div").hide();
        }
        if (assignmentComments) {
            assignmentInfoComments.text(assignmentComments ?? "").parent("div").show();
        } else {
            assignmentInfoComments.parent("div").hide();
        }

        assignmentInfoLoading.show();

        showCard("#assignmentInfoCardDisplay");

        if (`${assignmentPSAID}` in assignmentAverages[classIndex]) {
            let avgData = assignmentAverages[classIndex][`${assignmentPSAID}`];
            setupAssignmentAverage(avgData, assignmentPSAID, classIndex, isExtraCredit);
        } else if (premium || assignmentIndex === data[classIndex].grades.length - 1) {
            await $.ajax({
                method: "POST",
                url: "/assignmentAverage",
                data: {
                    "assignmentPSAID": assignmentPSAID,
                    "className": _data[classIndex].class_name,
                    "term": term,
                    "semester": semester
                }
            }).done(function (response) {
                assignmentAverages[classIndex][`${assignmentPSAID}`] = response;
                setupAssignmentAverage(response, assignmentPSAID, classIndex, isExtraCredit);
            });
        } else {
            setupAssignmentAverage(null, assignmentPSAID, classIndex, isExtraCredit);
        }

        assignmentInfoLoading.hide();
    }

    function setupAssignmentAverage(avgData, assignmentPSAID, classIndex, isExtraCredit) {
        if (avgData === null) {
            $("#assignmentInfoGraderoomUsers").addClass("locked").text("");
            $("#assignmentInfoGraderoomUsers ~ span > span:first-child").text("Graderoom Users this semester");
            $("#assignmentInfoAverage").addClass("locked").text("");
            $("#infoAverage .unlock-with").show();
        } else {
            $("#assignmentInfoGraderoomUsers").removeClass("locked").text(avgData.numUsers).parent("div").show();
            $("#assignmentInfoGraderoomUsers ~ span > span:first-child").text("Graderoom User" + (avgData.numUsers !== 1 ? "s" : "") + " this semester");

            if ('average' in avgData) {
                $("#assignmentInfoAverage").removeClass("locked").text(`${Math.round(avgData.average * 100) / 100}${isExtraCredit ? "" : `% (${getLetterGrade(avgData.average)})`}`);
            } else {
                $("#assignmentInfoAverage").addClass("locked").html(`<span class="text-muted">Not Enough Data</span>`);
            }
            $("#infoAverage .unlock-with").hide();
        }
    }

    function showEditAssignment(classIndex, assignmentIndex) {
        let assignmentDate = parsedData[classIndex].assignmentDates[assignmentIndex];
        let assignmentName = parsedData[classIndex].assignmentNames[assignmentIndex];
        let assignmentCategory = parsedData[classIndex].assignmentCategories[assignmentIndex];
        let assignmentScore = parsedData[classIndex].assignmentScoresParsed[assignmentIndex];
        let assignmentDescription = parsedData[classIndex].assignmentDescriptions[assignmentIndex];
        let assignmentComments = parsedData[classIndex].assignmentComments[assignmentIndex];
        let assignmentInfoDateEditable = $("#assignmentInfoDateEditable");
        let assignmentInfoLoading = $("#assignmentInfoLoading");
        assignmentInfoLoading.show();
        $("#infoAverage").hide();
        $("#assignmentInfoDate").parent("span").hide();
        assignmentInfoDateEditable.parent("span").show();
        assignmentInfoDateEditable.children("input").val(assignmentDate).off("blur").on("blur", () => {
            let assignment = _addedAssignments[classIndex].data[aData[classIndex][assignmentIndex]];
            let temp = assignment.date;
            assignment.date = $("#assignmentInfoDateEditable").children("input").val();

            if (temp !== assignment.date) {
                refreshWithoutReload(classIndex);
            }
        });
        $("#assignmentInfoName").text(assignmentName);
        $("#assignmentInfoCategory").text(assignmentCategory);
        $("#assignmentInfoScore").text(assignmentScore);
        if (assignmentDescription) {
            $("#assignmentInfoDescription").text(assignmentDescription).parent("div").show();
        } else {
            $("#assignmentInfoDescription").parent("div").hide();
        }
        if (assignmentComments) {
            $("#assignmentInfoComments").text(assignmentComments ?? "").parent("div").show();
        } else {
            $("#assignmentInfoComments").parent("div").hide();
        }

        $("#assignmentInfoBody > div:not(#infoAverage)").css("background-color", withAlpha(colors[classIndex], 10));

        showCard("#assignmentInfoCardDisplay");

        assignmentInfoLoading.hide();
    }
