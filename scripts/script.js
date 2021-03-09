var song = document.querySelector('.song');

$(document).ready(function(){
    $('.play').addClass('opaque');

    $('.play').click(function(){
        song.play();
        $('.play-wrap').slideToggle();
        $('.cont-wrap').slideToggle();
    });
})
