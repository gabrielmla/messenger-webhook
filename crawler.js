var request = require('request');
var cheerio = require('cheerio');

var START_URL = "http://partagecampina.com.br/site/cinema/";
var BASE_URL  = "http://partagecampina.com.br/site/filme/";

var movies = [];
var finished = false;

var linksFound = false;
var numPagesVisited = 0;
var pagesToVisit = new Set(); // O site possui links repetidos, utilizo o Set para evitar problemas

pagesToVisit.add(START_URL);

var promise = new Promise(function(resolve, reject) {
  // Realizar o crawl das paginas a serem visitadas
  function crawl() {
    if (pagesToVisit.length <= 0) {
      console.log("Parsing JSON...");
      movies = parseJson(movies);
      finished = true;
      return resolve(movies);
    }
    
    // Caso a pesquisa por links absolutos não tenha sido feita
    if (!linksFound) {
      nextPage = START_URL;
    } else {
      // Transformando o Set em Array para utilizar a função pop()
      pagesToVisit = Array.from(pagesToVisit);
      var nextPage = pagesToVisit.pop();
    }

    visitPage(nextPage, crawl);
  }

  function visitPage(url, callback) {
    // Incrementando numero de paginas visitadas
    numPagesVisited++;

    // Fazendo a request
    console.log("Visiting page " + url);
    request(url, function(error, response, body) {
      // Verificando o status HTTP (se eh igual a 200)
      console.log("Status code: " + response.statusCode);
      if(response.statusCode !== 200) {
        callback();
        return;
      }
      // Utilizando o cheerio para fazer o parse do HTML
      var $ = cheerio.load(body);

      // Caso seja a URL de ínicio, não adicionar
      if (url !== START_URL) {
        movies.push(collectMovies($));
      }

      // Na primeira iteração os links dos filmes deverão ser coletados
      if (!linksFound) {
        collectInternalLinks($);
        linksFound = true;
      }
      // Callback para realizar um novo crawl()
      callback();
    });
  }
  
  if (!finished) {
    crawl();
  }
});

/*promise.then(function(value) {
  console.log(value);
});*/

// Função para procurar palavras no HTML
function searchForWord($, word) {
  var bodyText = $('html > body').text().toLowerCase();
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

// Função para coletar todos os links absolutos presentes no HTML
function collectInternalLinks($) {
  var absoluteLinks = $("a[href^='" + BASE_URL + "']");
  absoluteLinks.each(function() {
      pagesToVisit.add($(this).attr('href'));
  });
}

// Função para coleta dos dados dos filmes do site partage
function collectMovies($) {
  var mDetails = [];
  var mSession = [];
  var mTitle = "Título: " + $('html > body').find('div > h1').text();
  mDetails.push(mTitle);
  var body = $('html > body').find('div.wpb_row').each(function (index) {
    $(this).find('div.wpb_wrapper').each(function (index) {
      if ($(this).children().length >= 5) {
        $(this).find('div').each(function (index) {
          mDetails.push($(this).text().trim());
        });
      }
    });
    
    $(this).find('tr > td').each(function (index) {
      mSession.push($(this).text());
    });
  });
  //console.log(movieJSON(mDetails, mSession));
  var movie = movieJSON(mDetails, mSession);
  return movie;
}

// Função para transformar os dados coletados em um JSON padronizado
function movieJSON(details, session) {
  var json = { title: '', description: '', genre: '', oriTitle: '', director: '', duration: '', distributor: '', sessions:[] };
  var keys = Object.keys(json);
  var sessions = keys.pop();
  for (i = 0; i < details.length; i++) {
    var key = keys[i];
    if (json.hasOwnProperty(key)) {
      json[key] = details[i];
    };
  }
  for (i = 0; i < session.length; i += 2) {
    var aux = session[i] + " " + session[i+1];
    json[sessions].push(aux);
  }
  return json;
}

function parseJson(data) {
  var result = [];
  var finalMessage = "";
  for (d in data) {
    let movie = data[d];
    let message = "";
    let keys = Object.keys(movie);
    for (i in keys) {
      let key = keys[i];
      if (movie.hasOwnProperty(key) && key !== 'description') {
        if (key === 'title') {
          message += movie[key].replace("Horário de Funcionamento e Valores", "");
          message += "\n";
        } else if (movie[key] !== '') {
          message += movie[key];
          message += "\n";
        } 
      }
    }
    message += "\n";

    if (finalMessage.length + message.length <= 640) {
      finalMessage += message;
    } else {
      result.push(finalMessage);
      finalMessage = message;
    }
  }
  result.push(finalMessage);
  return result;
}

module.exports = {
  promise
};