import Image, ImageDraw

def make_pies():
    borders = (('green', '#119d31'), ('red', '#c30404'), ('black', '#000000'), ('blue', '#130389'));
    for b in borders:
        for i in range(0, 11):
            for j in range(0, 11 - i):
                make_pie(b[0], b[1], i * 10, 100 - 10 * i - 10 * j, 10 * j);
    print 'done'

def make_pie(border, b_col, g, w, r):
    im = Image.new('RGB', (100, 100));
    draw = ImageDraw.Draw(im);
    draw.ellipse((0, 0, 100, 100), fill=b_col, outline=b_col);
    
    # green
    green = int(g / 100.0 * 360);
    if g > 0:
        draw.pieslice((15, 15, 85, 85), 0, green, fill='#90e0a3', outline='#90e0a3');

    # white
    white = int(w / 100.0 * 360);
    if w > 0:
        draw.pieslice((15, 15, 85, 85), green, green + white, fill='#ffffff', outline='#ffffff');

    # red
    if r > 0:
        draw.pieslice((15, 15, 85, 85), green + white, 360, fill='#c36262', outline='#c36262');
        del draw;

    mask = Image.open('images2/mask.png').convert('RGBA').split()[3];
    im.putalpha(mask);

    im.save('images3/' + border + '_' + str(g) + '_' + str(w) + '_' + str(r) + '.png');

if __name__ == '__main__':
    make_pies();
