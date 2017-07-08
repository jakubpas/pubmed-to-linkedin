$('body').bind(
    'DOMNodeInserted',
    function(objEvent){
        if ($(objEvent.target).attr('class') == 'modal-content-wrapper'
            && ($('.publication-id')).length == 0
        ) {
            InsertFormField();
        }
    }
);

var MAX_AUTHORS = 10;

var DATES = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'June': 6, 'July': 7, 'August': 8, 'September': 9,
    'October': 10, 'November': 11, 'December': 12, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    10: 10, 11: 11, 12: 12, '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9};


function nameCompare(myName, lastName, foreName) {
    var score = 0;

    if (myName.search(new RegExp(lastName, 'i')) >= 0) {
        score += 10;

        if (myName.search(new RegExp(lastName + '$', 'i')) >= 0) {
            score += 1;
        }

    }

    if (myName.search(new RegExp(foreName, 'i')) >= 0) {
        score += 2;

        if (myName.search(new RegExp('^' + foreName, 'i')) >= 0) {
            score += 1;
        }
    }

    var fi = foreName.substring(0, 1);
    if (myName.search(new RegExp('^' + fi, 'i')) >= 0) {
        score += 1;
    }

    return score;
}

function addAuthor(authorName) {

    if (typeof(authorName) != 'string') {
        authorName = "";
    }
    authorName = authorName.replace(/[\>\<]/g, "");

    var html = ''+
        '<li class="pe-s-list__item pe-co-contributor">'+
        '<img class="lazy-image EntityPhoto-circle-2 ghost-person loaded" alt="'+ authorName +
        '" height="28" width="28" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">'+
        '<div class="pe-co-contributor__details">'+
        '<span class="pe-co-contributor__name">' + authorName + '</span>'+
        '</div>'+
        '</li>';

    $('li.pe-s-list__item.pe-co-contributor:last-child').after(html);
}

function pubmedRequest(pubmedId) {
    var reference = {};
    var title = '';

    var xhr = new XMLHttpRequest();
    xhr.open("GET", 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=' + pubmedId + '&retmode=xml&rettype=citation',
        true);
    xhr.onload = function () {
        if (xhr.status != 200) {
            alert('Error with PubMed lookup.  Status code: ' + xhr.status + ' ' + xhr.statusText);
        }
        else {
            var pubtext = xhr.responseText;

            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(pubtext, "text/xml");

            reference.title = xmlDoc.getElementsByTagName("ArticleTitle")[0].childNodes[0].nodeValue;

            title = xmlDoc.getElementsByTagName("Title")[0].childNodes[0].nodeValue;
            reference.pub_title = title;

            try {
                var publicationAbstract = xmlDoc.getElementsByTagName("AbstractText");
                var publicationText = "";
                for (var i = 0; i < publicationAbstract.length; i++) {
                    var pa = publicationAbstract[i];
                    var label = pa.getAttribute("Label");
                    if (label) {
                        publicationText += label + ": ";
                    }
                    publicationText += pa.childNodes[0].nodeValue + "\n";
                }
                reference.abstract = publicationText;
            }
            catch (err) {
                reference.abstract = null;
            }
            var pubDate = xmlDoc.getElementsByTagName("PubDate")[0];
            reference.pub_year = pubDate.getElementsByTagName("Year")[0].childNodes[0].nodeValue;

            var pubMonthNodes = pubDate.getElementsByTagName("Month");
            if (pubMonthNodes[0] != null) {
                var pubMonth = pubMonthNodes[0].childNodes[0].nodeValue;
                reference.pub_month = DATES[pubMonth];
            }
            else {
                reference.pub_month = null;
            }

            var pubDayNodes = pubDate.getElementsByTagName("Day");
            if (pubDayNodes[0] != null) {
                reference.pub_day = pubDayNodes[0].childNodes[0].nodeValue;
            }
            else {
                reference.pub_day = null;
            }

            reference.url = 'http://www.ncbi.nlm.nih.gov/pubmed/' + pubmedId;

            var authorNodes = xmlDoc.getElementsByTagName("Author");
            reference.authors = [];
            for (i = 0; i < authorNodes.length; i++) {
                var authorNode = authorNodes[i];
                var author = Object();
                author.last_name = authorNode.getElementsByTagName("LastName")[0].childNodes[0].nodeValue;
                author.first_name = authorNode.getElementsByTagName("ForeName")[0].childNodes[0].nodeValue;
                reference.authors.push(author);
            }

            fillForm(reference);
        }
    };
    xhr.send();
}


function doiRequest(doiId) {
    var ref = {};
    var xhr = new XMLHttpRequest();
    xhr.open("GET", 'https://api.crossref.org/works/' + doiId,
        true);
    xhr.onload = function () {
        if (xhr.status != 200) {
            alert('Error while DOI lookup. Code: ' + xhr.status + ' ' + xhr.statusText);
        }
        else {
            var jr = JSON.parse(xhr.responseText)['message'];
            ('title' in jr) ? ref.title = jr['title'] : ref.title = null;
            ('container-title' in jr) ? ref.pub_title = jr['container-title'] : ref.pub_title = null;
            ('URL' in jr) ? ref.url = jr['URL'] : ref.url = null;

            if ('issued' in jr) {
                var pub_date = jr['issued'];
                var dp = pub_date['date-parts'][0];
                ref.pub_year = dp[0];
                ref.pub_day = dp[2];
                ref.pub_month = dp[1];
            }

            ref.authors = [];
            for (var i = 0; i < jr['author'].length; i++) {
                var authorObj = jr['author'][i];
                var author = Object();
                author.last_name = authorObj['family'];
                author.first_name = authorObj['given'];
                ref.authors.push(author);
            }
            fillForm(ref);
        }
    };
    xhr.send();
}

function fillForm(ref) {
    var myName = $(".pv-top-card-section__name").text();

    if (ref.title != null) {
        var title = $('#publication-title');
        title.val(ref.title);
        title.focus();

    }
    if (ref.pub_title != null) {
        var publisher = $('#publication-publisher');
        publisher.val(ref.pub_title);
        publisher.focus();
    }
    if (ref.abstract != null) {
        var description = $('#publication-description');
        description.val(ref.abstract);
        description.focus()
    }
    if (ref.pub_year != null) {
        var year = $('#publication-year');
        year.val(ref.pub_year);
        year.focus()
    }
    if (ref.pub_month != null) {
        var month = $('#publication-month');
        month.val(ref.pub_month);
        month.focus();
    }
    if (ref.pub_day != null) {
        var day = $('#publication-day');
        day.val(ref.pub_day);
        day.focus()
    }
    if (ref.url != null) {
        var url = $('#publication-url');
        url.val(ref.url);
        url.focus()
    }

    var bestScore = 9;
    var bestName = -1;
    var nauthors = ref.authors.length;

    var author = '';
    for (i = 0; i < nauthors; i++) {
        author = ref.authors[i];
        var similarityScore = nameCompare(myName, author.last_name, author.first_name);

        if (similarityScore > bestScore) {
            bestScore = similarityScore;
            bestName = i;
        }
    }

    var maxAuthors = MAX_AUTHORS + 1;
    var useEtAl = false;

    if (nauthors > maxAuthors) {
        useEtAl = true;
        nauthors = maxAuthors;
    }

    if (bestName >= maxAuthors && useEtAl) {
        bestName = maxAuthors - 2;
    }

    $('li.co-contributor > span.jellybean > span.remove').trigger("click");
    $('li.co-contributor:first-child').addClass("myself");

    var before_me = true;

    for (var i = 0; i < nauthors; i++) {
        if (i == bestName) {
            before_me = false;
            continue;
        }
        author = ref.authors[i];

        if ((i == maxAuthors - 1) && useEtAl) {
            addAuthor("et al");
        }
        else {
            addAuthor(author.first_name + " " + author.last_name);
        }
    }
}


function lookupPubmed() {

    var pubmedId = $('#pubmedId').val();

    var is_doi = false;
    var doi_pat = new RegExp("\..*\/");
    if (doi_pat.test(pubmedId)) {
        is_doi = true;
    }
    if (is_doi) {
        pubmedId = pubmedId.replace(/\s/g, "");
        doiRequest(pubmedId);
    }
    else {
        pubmedId = pubmedId.replace(/\D/g, "");
        pubmedRequest(pubmedId);
    }

}

function InsertFormField() {
    var formText = '' +
        '<div class="pe-form-field publication-id">' +
        '<label for="publication-id" class="pe-form-field__label label-text">PMId/DOI</label>' +
        '<span class="ember-view"><input id="pubmedId" type="text" maxlength="255" id="publication-id" style="width: 400px;margin-right: 20px;"></span>' +
        '<span class="ember-view"><input class="pe-form-footer__action--submit" type="button" id="pubmedSearch" value="Pubmed Search" name="pubmedsearch"></span>' +
        '</div>';

    $('.pe-form-field.publication-title.floating-label').before(formText);
    $('#pubmedSearch').click(lookupPubmed);
}




